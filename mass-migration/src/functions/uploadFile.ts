// Initialize Dynatrace tracing before other imports
import '../index.js';

import { app, InvocationContext } from '@azure/functions';
import { createLogger, Logger } from '../utils/logger.js';
import { getBlobStream } from '../services/blobStorage.js';
import { executeQuery, bulkInsertValues, bulkInsertMcResponse } from '../services/database.js';
import { queueValidateTokens, ValidateTokensMessage, queueBatchManager, BatchManagerMessage } from '../services/queueService.js';
import { sendMigrationStartEmail } from '../services/emailService.js';
import { parseCSVFromStream } from '../utils/fileParser.js';
import {
  MonerisTokenCsvColumns,
  mapCsvRowToMonerisToken,
  toMonerisTokenStaging,
} from '../models/monerisToken.js';
import {
  generateFileId,
  parseFileName,
  AuditMessageCodes,
} from '../models/migrationBatch.js';
import { getConfig } from '../config/index.js';

/**
 * Event Grid event schema for blob created events (when delivered via Storage Queue)
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

// Column list for Moneris tokens staging table
const MONERIS_STAGING_COLUMNS = [
  'FILE_ID', 'BATCH_ID', 'MONERIS_TOKEN', 'EXP_DATE', 'ENTITY_ID', 'ENTITY_TYPE', 'ENTITY_STS',
  'CREATION_DATE', 'LAST_USE_DATE', 'TRX_SEQ_NO', 'BUSINESS_UNIT', 'VALIDATION_STATUS',
  'MIGRATION_STATUS', 'ERROR_CODE', 'PMR', 'UPDATED_BY', 'USAGE_TYPE'
];

/**
 * Queue trigger handler for Event Grid blob notifications
 * Event Grid sends blob created events to Storage Queue, which triggers this function
 * This allows processing large files without HTTP timeout limits
 */
async function uploadFileQueueHandler(
  queueItem: unknown,
  context: InvocationContext
): Promise<void> {
  const logger: Logger = createLogger('uploadFile', context);

  try {
    // Parse the Event Grid event from queue message
    // Event Grid wraps the event in a specific format when sending to queue
    const event = parseEventGridMessage(queueItem, logger);

    if (!event) {
      logger.warn('Could not parse Event Grid message from queue', { queueItem });
      return;
    }

    if (event.eventType !== 'Microsoft.Storage.BlobCreated') {
      logger.info('Skipping non-blob-created event', { eventType: event.eventType });
      return;
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

    logger.info('Processing blob event from queue', {
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

    logger.info('Queue message processed successfully');
  } catch (error) {
    logger.error('Failed to process Event Grid notification from queue', error);
    throw error; // Rethrow to trigger queue retry mechanism
  }
}

/**
 * Parse Event Grid message from queue
 * Event Grid can send messages in different formats depending on configuration
 */
function parseEventGridMessage(queueItem: unknown, logger: Logger): EventGridEvent | null {
  try {
    // If it's already an object, check if it's the event directly or wrapped
    if (typeof queueItem === 'object' && queueItem !== null) {
      const item = queueItem as Record<string, unknown>;

      // Direct Event Grid event format
      if (item.eventType && item.data) {
        return item as unknown as EventGridEvent;
      }

      // Array format (Event Grid sometimes sends as array)
      if (Array.isArray(queueItem) && queueItem.length > 0) {
        return queueItem[0] as EventGridEvent;
      }
    }

    // If it's a string, try to parse as JSON
    if (typeof queueItem === 'string') {
      // Try base64 decode first (Azure Queue sometimes base64 encodes)
      try {
        const decoded = Buffer.from(queueItem, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          return parsed[0] as EventGridEvent;
        }
        return parsed as EventGridEvent;
      } catch {
        // Not base64, try direct JSON parse
        const parsed = JSON.parse(queueItem);
        if (Array.isArray(parsed)) {
          return parsed[0] as EventGridEvent;
        }
        return parsed as EventGridEvent;
      }
    }

    logger.warn('Unknown queue message format', { type: typeof queueItem });
    return null;
  } catch (error) {
    logger.error('Failed to parse Event Grid message', error);
    return null;
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
      batchSize: 500,
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
 * Process Mastercard response file using BULK INSERT
 * Queue triggers have no timeout limit, so we can process large files directly
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

  const mcResponseMatch = baseFileName.match(/^(?:MCRSP_)?([A-Z0-9]+)\.([PTI])\.(\d{8})\.(\d{4})$/i);
  if (mcResponseMatch) {
    const sourceId = mcResponseMatch[1].toUpperCase();
    const tokenType = mcResponseMatch[2].toUpperCase();
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
  fileLogger.info('Processing MC response file via BULK INSERT', {
    fileName,
    fileId,
    contentLength,
    contentLengthMB: (contentLength / (1024 * 1024)).toFixed(2),
  });

  // Insert audit log
  await insertAuditLog(fileId, null, 'MC_RESP_RECV',
    `Mastercard response received: ${fileName}`, { contentLength });

  try {
    fileLogger.info('Starting BULK INSERT from blob', { containerName, blobName });

    // Use BULK INSERT to load directly from blob storage
    // This is much faster than streaming for large files
    const result = await bulkInsertMcResponse(
      containerName,
      blobName,
      fileId
    );

    fileLogger.info('BULK INSERT completed', {
      fileId,
      rowsInserted: result.rowsInserted,
      rowsUpdated: result.rowsUpdated,
      contentLengthMB: (contentLength / (1024 * 1024)).toFixed(2),
    });

    // Insert audit log for successful load
    await insertAuditLog(fileId, null, 'MC_RESP_LOADED',
      `Mastercard response loaded: ${result.rowsInserted} PG tokens`, {
        rowsInserted: result.rowsInserted,
        rowsUpdated: result.rowsUpdated
      });

    // Now that PG tokens are loaded, queue batch manager to start processing
    // This is the correct point to start batch processing - after MC response is available
    const batchResult = await executeQuery<{ SOURCE_ID: string; TOTAL_BATCHES: number }>(
      `SELECT SOURCE_ID, TOTAL_BATCHES FROM TOKEN_MIGRATION_BATCH
       WHERE FILE_ID = @fileId AND BATCH_ID = @fileId`,
      { fileId }
    );

    if (batchResult.recordset.length > 0) {
      const { SOURCE_ID: sourceId, TOTAL_BATCHES: totalBatches } = batchResult.recordset[0];

      const batchManagerMessage: BatchManagerMessage = {
        fileId,
        sourceId,
        totalBatches: totalBatches ?? 1,
      };

      await queueBatchManager(batchManagerMessage);
      fileLogger.info('PG tokens loaded, queued for batch management', {
        fileId,
        sourceId,
        totalBatches,
        pgTokenCount: result.rowsInserted
      });
    } else {
      fileLogger.warn('No batch record found for fileId, cannot queue batch manager', { fileId });
    }

  } catch (error) {
    fileLogger.error('BULK INSERT failed', error);
    await insertAuditLog(fileId, null, 'MC_RESP_ERROR',
      `Failed to load Mastercard response: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

// Register the Storage Queue trigger for Event Grid blob notifications
// Event Grid sends blob created events to the queue, which triggers this function
// Queue triggers have no timeout limit, allowing processing of large files
app.storageQueue('uploadFile', {
  queueName: 'file-upload-queue',
  connection: 'AzureWebJobsStorage',
  handler: uploadFileQueueHandler,
});

// Export for testing
export { uploadFileQueueHandler };
