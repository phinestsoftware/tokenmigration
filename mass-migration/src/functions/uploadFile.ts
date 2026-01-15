import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createLogger, Logger } from '../utils/logger.js';
import { getBlobStream, getBlobProperties } from '../services/blobStorage.js';
import { executeQuery, bulkInsertValues } from '../services/database.js';
import { queueValidateTokens, ValidateTokensMessage, queueBatchManager, BatchManagerMessage } from '../services/queueService.js';
import { sendMigrationStartEmail } from '../services/emailService.js';
import { parseCSVFromStream } from '../utils/fileParser.js';
import {
  MonerisTokenCsvColumns,
  mapCsvRowToMonerisToken,
  toMonerisTokenStaging,
} from '../models/monerisToken.js';
import { mapCsvRowToPgToken, toPgTokenStaging } from '../models/pgToken.js';
import {
  generateFileId,
  parseFileName,
  AuditMessageCodes,
} from '../models/migrationBatch.js';

/**
 * Event Grid event schema for blob created events
 */
interface EventGridEvent {
  id: string;
  topic: string;
  subject: string;
  eventType: string;
  eventTime: string;
  data: {
    api: string;
    clientRequestId: string;
    requestId: string;
    eTag: string;
    contentType: string;
    contentLength: number;
    blobType: string;
    url: string;
  };
  dataVersion: string;
  metadataVersion: string;
}

/**
 * Event Grid subscription validation event
 */
interface SubscriptionValidationEvent {
  validationCode: string;
  validationUrl: string;
}

// Column list for Moneris tokens staging table
const MONERIS_STAGING_COLUMNS = [
  'FILE_ID', 'BATCH_ID', 'MONERIS_TOKEN', 'EXP_DATE', 'ENTITY_ID', 'ENTITY_TYPE', 'ENTITY_STS',
  'CREATION_DATE', 'LAST_USE_DATE', 'TRX_SEQ_NO', 'BUSINESS_UNIT', 'VALIDATION_STATUS',
  'MIGRATION_STATUS', 'ERROR_CODE', 'PMR', 'UPDATED_BY', 'USAGE_TYPE'
];

// Column list for PG tokens staging table
const PG_STAGING_COLUMNS = [
  'FILE_ID', 'MONERIS_TOKEN', 'PG_TOKEN', 'CARD_NUMBER_MASKED', 'FIRST_SIX', 'LAST_FOUR',
  'FUNDING_METHOD', 'EXP_MONTH', 'EXP_YEAR', 'ERROR_CAUSE', 'ERROR_EXPLANATION', 'ERROR_FIELD',
  'ERROR_SUPPORT_CODE', 'MIGRATION_STATUS', 'NETWORK_TOKEN_STATUS', 'CC_CARD_BRAND', 'CC_EXP_DATE',
  'APIOPERATION', 'PAYMENT_METHOD_TYPE', 'SOURCEOFFUNDS_TYPE', 'SOURCEOFFUNDS_NUMBER',
  'MONERIS_EXPIRY_MONTH', 'MONERIS_EXPIRY_YEAR', 'MONERIS2PG_MIGRATION_STATUS'
];

/**
 * HTTP trigger handler for Event Grid blob notifications
 * This allows streaming large files without loading them entirely into memory
 */
async function uploadFileHttpHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger: Logger = createLogger('uploadFileHttp', context);

  try {
    // Handle Event Grid subscription validation
    const eventGridValidation = request.headers.get('aeg-event-type');
    if (eventGridValidation === 'SubscriptionValidation') {
      const events = await request.json() as Array<{ data: SubscriptionValidationEvent }>;
      const validationCode = events[0]?.data?.validationCode;
      logger.info('Event Grid subscription validation', { validationCode });
      return {
        status: 200,
        jsonBody: { validationResponse: validationCode },
      };
    }

    // Parse Event Grid events
    const events = await request.json() as EventGridEvent[];

    if (!events || events.length === 0) {
      logger.warn('No events in request');
      return { status: 400, body: 'No events provided' };
    }

    // Process each event
    for (const event of events) {
      if (event.eventType !== 'Microsoft.Storage.BlobCreated') {
        logger.info('Skipping non-blob-created event', { eventType: event.eventType });
        continue;
      }

      const blobUrl = event.data.url;
      const contentLength = event.data.contentLength;

      // Parse blob URL to get container and blob name
      // URL format: https://<account>.blob.core.windows.net/<container>/<blob-path>
      const urlParts = new URL(blobUrl);
      const pathParts = urlParts.pathname.split('/').filter(p => p);
      const containerName = pathParts[0];
      const blobName = pathParts.slice(1).join('/');
      const fileName = pathParts[pathParts.length - 1];

      logger.info('Processing blob event', {
        containerName,
        blobName,
        fileName,
        contentLength,
        contentLengthMB: (contentLength / (1024 * 1024)).toFixed(2),
      });

      // Determine if this is a billing input or MC response
      const isMastercardResponse = containerName === 'mastercard-mapping' ||
        fileName.includes('.mc.response');

      if (isMastercardResponse) {
        await handleMastercardResponseStream(containerName, blobName, fileName, contentLength, logger);
      } else if (containerName === 'billing-input') {
        await handleBillingInputStream(containerName, blobName, fileName, contentLength, logger);
      } else {
        logger.warn('Unknown container, skipping', { containerName });
      }
    }

    return { status: 200, body: 'Events processed successfully' };
  } catch (error) {
    logger.error('Failed to process Event Grid notification', error);
    return {
      status: 500,
      body: `Error processing event: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Process billing input file using streaming
 */
async function handleBillingInputStream(
  containerName: string,
  blobName: string,
  fileName: string,
  contentLength: number,
  logger: Logger
): Promise<void> {
  const fileId = generateFileId(fileName);
  const fileLogger = logger.withFileId(fileId);

  fileLogger.info('Processing billing file via streaming', {
    fileName,
    contentLength,
    contentLengthMB: (contentLength / (1024 * 1024)).toFixed(2),
  });

  // Parse file metadata
  const parsedFileName = parseFileName(fileName);
  const sourceId = parsedFileName?.sourceId ?? 'UNKNOWN';
  const tokenType = parsedFileName?.tokenType ?? 'P';

  // Create batch record BEFORE processing
  await createFileBatchRecord(fileId, fileName, sourceId, tokenType, 0, `${containerName}/${blobName}`, 'VALIDATING');

  try {
    // Get blob stream - does NOT load entire file into memory
    const stream = await getBlobStream(containerName, blobName);

    // Validate header by peeking at first line
    // For now, we'll validate during parsing and reject if invalid
    fileLogger.info('Starting streaming CSV parse');

    // Insert audit log
    await insertAuditLog(fileId, null, AuditMessageCodes.FILE_RECEIVED,
      `File received (streaming): ${fileName}`, { sourceId, tokenType, contentLength });

    // Stream parse and insert in batches
    const streamResult = await parseCSVFromStream(stream, {
      batchSize: 5000,
      onBatch: async (records, batchNumber) => {
        // Validate header on first batch
        if (batchNumber === 1 && records.length > 0) {
          const firstRecord = records[0];
          const columns = Object.keys(firstRecord);
          const missingColumns = MonerisTokenCsvColumns.filter(col => !columns.includes(col));
          if (missingColumns.length > 0) {
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
          }
        }

        fileLogger.info(`Processing batch ${batchNumber}`, { recordsInBatch: records.length });
        await loadMonerisTokensToStagingBatch(records, fileId, fileLogger);
      },
      onProgress: (processed) => {
        if (processed % 50000 === 0) {
          fileLogger.info('Stream processing progress', { processedRecords: processed });
        }
      },
    });

    const recordCount = streamResult.totalRecords;

    fileLogger.info('File parsed and loaded via streaming', {
      recordCount,
      batchesProcessed: streamResult.batchesProcessed,
    });

    // Update batch record
    await updateBatchStatus(fileId, 'PENDING', recordCount);
    await updateBatchStatus(fileId, 'PROCESSING', recordCount);

    // Insert audit log for successful load
    await insertAuditLog(fileId, null, AuditMessageCodes.FILE_LOADED,
      `File loaded to staging: ${recordCount} records`, { recordCount });

    // Send start email notification
    await sendMigrationStartEmail({
      fileId,
      fileName,
      sourceId,
      status: 'STARTED',
      totalTokens: recordCount,
      startTime: new Date(),
    });

    // Queue validation message
    const validateMessage: ValidateTokensMessage = {
      fileId,
      context: 'MONERIS',
      sourceId,
      fileName,
    };
    await queueValidateTokens(validateMessage);

    fileLogger.info('File processing completed, queued for validation');

  } catch (error) {
    fileLogger.error('File processing failed', error);
    await updateBatchStatus(fileId, 'REJECTED');
    await insertAuditLog(fileId, null, AuditMessageCodes.FILE_REJECTED,
      `File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

/**
 * Process Mastercard response file using streaming
 */
async function handleMastercardResponseStream(
  containerName: string,
  blobName: string,
  fileName: string,
  contentLength: number,
  logger: Logger
): Promise<void> {
  // Parse file ID from filename
  let fileId: string = '';
  const baseFileName = fileName.replace('.mc.response', '').replace('.csv', '');

  let sourceId = 'UNKNOWN';
  let tokenType = 'P';

  const mcResponseMatch = baseFileName.match(/^(?:MCRSP_)?([A-Z0-9]+)\.([PTI])\.(\d{8})\.(\d{4})$/i);
  if (mcResponseMatch) {
    sourceId = mcResponseMatch[1].toUpperCase();
    tokenType = mcResponseMatch[2].toUpperCase();
    const date = mcResponseMatch[3];
    const sequence = mcResponseMatch[4];
    fileId = `${sourceId}.${tokenType}.${date}.${sequence}`;
  } else if (fileName.includes('FILE_')) {
    const match = fileName.match(/FILE_(\d+)/);
    fileId = match ? `FILE_${match[1]}` : baseFileName;
  } else {
    fileId = baseFileName;
  }

  const fileLogger = logger.withFileId(fileId);
  fileLogger.info('Processing MC response file via streaming', {
    fileName,
    fileId,
    contentLength,
    contentLengthMB: (contentLength / (1024 * 1024)).toFixed(2),
  });

  // Insert audit log
  await insertAuditLog(fileId, null, 'MC_RESP_RECV',
    `Mastercard response received (streaming): ${fileName}`, { sourceId, tokenType, contentLength });

  try {
    // Get blob stream
    const stream = await getBlobStream(containerName, blobName);

    // Stream parse and insert in batches
    const streamResult = await parseCSVFromStream(stream, {
      batchSize: 5000,
      onBatch: async (records, batchNumber) => {
        fileLogger.info(`Processing MC batch ${batchNumber}`, { recordsInBatch: records.length });
        await loadPgTokensToStagingBatch(records, fileId, fileLogger);
      },
      onProgress: (processed) => {
        if (processed % 50000 === 0) {
          fileLogger.info('MC stream processing progress', { processedRecords: processed });
        }
      },
    });

    const recordCount = streamResult.totalRecords;

    fileLogger.info('MC response parsed and loaded via streaming', {
      recordCount,
      batchesProcessed: streamResult.batchesProcessed,
    });

    // Create batch record
    await createFileBatchRecord(fileId, fileName, sourceId, tokenType, recordCount, `${containerName}/${blobName}`, 'PROCESSING');

    // Insert audit log for successful load
    await insertAuditLog(fileId, null, 'MC_RESP_LOAD',
      `Mastercard response loaded: ${recordCount} tokens`, { recordCount });

    // Queue batch manager
    const batchManagerMessage: BatchManagerMessage = {
      fileId,
      sourceId,
      totalBatches: 1,
    };
    await queueBatchManager(batchManagerMessage);

    fileLogger.info('PG tokens loaded, queued for batch management', {
      fileId,
      sourceId,
      pgTokenCount: recordCount
    });

  } catch (error) {
    fileLogger.error('MC response processing failed', error);
    await insertAuditLog(fileId, null, 'MC_RESP_ERROR',
      `MC response processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

/**
 * Convert Moneris records to bulk insert format
 */
function mapRecordsToBulkInsertFormat(
  records: Record<string, string>[],
  fileId: string
): Record<string, unknown>[] {
  return records.map((row) => {
    const record = mapCsvRowToMonerisToken(row);
    const t = toMonerisTokenStaging(record, fileId);
    return {
      FILE_ID: t.fileId,
      BATCH_ID: t.batchId,
      MONERIS_TOKEN: t.monerisToken,
      EXP_DATE: t.expDate,
      ENTITY_ID: t.entityId,
      ENTITY_TYPE: t.entityType,
      ENTITY_STS: t.entitySts,
      CREATION_DATE: t.creationDate,
      LAST_USE_DATE: t.lastUseDate,
      TRX_SEQ_NO: t.trxSeqNo,
      BUSINESS_UNIT: t.businessUnit,
      VALIDATION_STATUS: t.validationStatus,
      MIGRATION_STATUS: t.migrationStatus,
      ERROR_CODE: t.errorCode,
      PMR: t.pmr,
      UPDATED_BY: t.updatedBy,
      USAGE_TYPE: t.usageType,
    };
  });
}

/**
 * Load a batch of Moneris tokens to staging
 */
async function loadMonerisTokensToStagingBatch(
  records: Record<string, string>[],
  fileId: string,
  logger: Logger
): Promise<number> {
  const rows = mapRecordsToBulkInsertFormat(records, fileId);
  const insertedCount = await bulkInsertValues('MONERIS_TOKENS_STAGING', MONERIS_STAGING_COLUMNS, rows);
  logger.info('Batch inserted to staging', { batchSize: rows.length, insertedCount });
  return insertedCount;
}

/**
 * Convert PG token records to bulk insert format
 */
function mapPgRecordsToBulkInsertFormat(
  records: Record<string, string>[],
  fileId: string
): Record<string, unknown>[] {
  return records.map((row) => {
    const record = mapCsvRowToPgToken(row);
    const staging = toPgTokenStaging(record, fileId);
    return {
      FILE_ID: staging.fileId,
      MONERIS_TOKEN: staging.monerisToken,
      PG_TOKEN: staging.pgToken,
      CARD_NUMBER_MASKED: staging.cardNumberMasked,
      FIRST_SIX: staging.firstSix,
      LAST_FOUR: staging.lastFour,
      FUNDING_METHOD: staging.fundingMethod,
      EXP_MONTH: staging.expMonth,
      EXP_YEAR: staging.expYear,
      ERROR_CAUSE: staging.errorCause,
      ERROR_EXPLANATION: staging.errorExplanation,
      ERROR_FIELD: staging.errorField,
      ERROR_SUPPORT_CODE: staging.errorSupportCode,
      MIGRATION_STATUS: staging.migrationStatus,
      NETWORK_TOKEN_STATUS: staging.networkTokenStatus,
      CC_CARD_BRAND: staging.ccCardBrand,
      CC_EXP_DATE: staging.ccExpDate,
      APIOPERATION: staging.apiOperation,
      PAYMENT_METHOD_TYPE: staging.paymentMethodType,
      SOURCEOFFUNDS_TYPE: staging.sourceOfFundsType,
      SOURCEOFFUNDS_NUMBER: staging.sourceOfFundsNumber,
      MONERIS_EXPIRY_MONTH: staging.monerisExpiryMonth,
      MONERIS_EXPIRY_YEAR: staging.monerisExpiryYear,
      MONERIS2PG_MIGRATION_STATUS: staging.moneris2pgMigrationStatus,
    };
  });
}

/**
 * Load a batch of PG tokens to staging
 */
async function loadPgTokensToStagingBatch(
  records: Record<string, string>[],
  fileId: string,
  logger: Logger
): Promise<number> {
  const rows = mapPgRecordsToBulkInsertFormat(records, fileId);
  const insertedCount = await bulkInsertValues('PG_TOKENS_STAGING', PG_STAGING_COLUMNS, rows);
  logger.info('PG batch inserted to staging', { batchSize: rows.length, insertedCount });
  return insertedCount;
}

/**
 * Create file batch record
 */
async function createFileBatchRecord(
  fileId: string,
  fileName: string,
  sourceId: string,
  tokenType: string,
  tokenCount: number,
  blobPath: string,
  status: string = 'PENDING'
): Promise<void> {
  await executeQuery(
    `INSERT INTO TOKEN_MIGRATION_BATCH
     (BATCH_ID, FILE_ID, FILE_NAME, SOURCE_ID, TOKEN_TYPE, MIGRATION_TYPE, CONTEXT,
      STATUS, TOTAL_TOKEN_COUNT, BLOB_PATH, FILE_TIMESTAMP)
     VALUES (@batchId, @fileId, @fileName, @sourceId, @tokenType, @migrationType, 'MassMigPG',
             @status, @tokenCount, @blobPath, GETUTCDATE())`,
    {
      batchId: fileId,
      fileId,
      fileName,
      sourceId,
      tokenType,
      migrationType: 'MASS',
      status,
      tokenCount,
      blobPath,
    }
  );
}

/**
 * Update batch status
 */
async function updateBatchStatus(
  fileId: string,
  status: string,
  validTokenCount?: number
): Promise<void> {
  let query = `UPDATE TOKEN_MIGRATION_BATCH
               SET STATUS = @status, UPDATED_AT = GETUTCDATE()`;

  if (validTokenCount !== undefined) {
    query += `, VALID_TOKEN_COUNT = @validTokenCount`;
  }

  query += ` WHERE FILE_ID = @fileId AND BATCH_ID = @fileId`;

  await executeQuery(query, { fileId, status, validTokenCount });
}

/**
 * Insert audit log entry
 */
async function insertAuditLog(
  fileId: string | null,
  batchId: string | null,
  messageCode: string,
  messageText: string,
  additionalInfo?: Record<string, unknown>
): Promise<void> {
  await executeQuery(
    `INSERT INTO TOKEN_MIGRATION_AUDIT_LOG
     (FILE_ID, BATCH_ID, MESSAGE_CODE, MESSAGE_TEXT, ADDITIONAL_INFO, LOG_LEVEL)
     VALUES (@fileId, @batchId, @messageCode, @messageText, @additionalInfo, 'INFO')`,
    {
      fileId,
      batchId,
      messageCode,
      messageText,
      additionalInfo: additionalInfo ? JSON.stringify(additionalInfo) : null,
    }
  );
}

// Register the HTTP trigger for Event Grid
// Event Grid sends blob created notifications here, allowing us to stream large files
app.http('uploadFile', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'upload/event-grid',
  handler: uploadFileHttpHandler,
});

// Export for testing
export { uploadFileHttpHandler };
