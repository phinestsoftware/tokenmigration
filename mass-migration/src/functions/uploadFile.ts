import { app, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../config/index.js';
import { createLogger, Logger } from '../utils/logger.js';
import { downloadBlob } from '../services/blobStorage.js';
import { executeQuery, bulkInsertValues } from '../services/database.js';
import { queueValidateTokens, ValidateTokensMessage, queueBatchManager, BatchManagerMessage } from '../services/queueService.js';
import { sendMigrationStartEmail } from '../services/emailService.js';
import { parseCsv, validateFileStructure } from '../utils/fileParser.js';
import {
  MonerisTokenRecord,
  MonerisTokenCsvColumns,
  mapCsvRowToMonerisToken,
  toMonerisTokenStaging,
} from '../models/monerisToken.js';
import { mapCsvRowToPgToken, toPgTokenStaging, PgTokenCsvColumns } from '../models/pgToken.js';
import {
  generateFileId,
  parseFileName,
  AuditMessageCodes,
} from '../models/migrationBatch.js';

interface BlobTriggerMetadata {
  name: string;
  uri: string;
}

/**
 * Upload File Function
 * Triggered by blob uploads to billing-input/* or mastercard-mapping/*
 */
async function uploadFileHandler(
  blob: unknown,
  context: InvocationContext
): Promise<void> {
  const blobBuffer = blob as Buffer;
  const triggerMetadata = context.triggerMetadata as unknown as BlobTriggerMetadata;
  const blobPath = triggerMetadata?.name ?? 'unknown';
  const logger: Logger = createLogger('uploadFile', context);

  logger.info('Blob trigger activated', { blobPath });

  try {
    // Parse blob path to determine context
    const pathParts = blobPath.split('/');
    const fileName = pathParts[pathParts.length - 1];

    // Determine context based on function name (more reliable than path parsing)
    // uploadFileMastercard handles MC responses, uploadFileBilling handles billing input
    const isMastercardResponse = context.functionName === 'uploadFileMastercard' ||
      fileName.includes('.mc.response') ||
      blobPath.includes('mastercard');
    const contextType = isMastercardResponse ? 'PG' : 'MONERIS';

    // Read and decode blob content
    const content = blobBuffer.toString('utf-8');

    // Handle MC response files differently - they update existing batches
    if (isMastercardResponse) {
      await handleMastercardResponse(fileName, content, logger);
      return;
    }

    // Generate file ID for billing input files
    const fileId = generateFileId(fileName);
    const fileLogger = logger.withFileId(fileId);

    fileLogger.info('Processing billing file', { fileName, contextType, blobPath });

    // Parse file metadata
    const parsedFileName = parseFileName(fileName);
    const sourceId = parsedFileName?.sourceId ?? 'UNKNOWN';
    const tokenType = parsedFileName?.tokenType ?? 'P';

    // Create batch record BEFORE validation so rejected files have a record for reporting
    await createFileBatchRecord(fileId, fileName, sourceId, tokenType, 0, blobPath, 'VALIDATING');

    // Validate file structure
    const expectedColumns = MonerisTokenCsvColumns;
    const validation = validateFileStructure(content, expectedColumns);

    if (!validation.isValid) {
      fileLogger.error('File validation failed', undefined, { errors: validation.errors });
      // Update batch status to REJECTED before logging and throwing
      await updateBatchStatus(fileId, 'REJECTED');
      await insertAuditLog(fileId, null, AuditMessageCodes.FILE_REJECTED,
        `File validation failed: ${validation.errors.join(', ')}`, { errors: validation.errors });
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    // Parse CSV content
    const parseResult = parseCsv<Record<string, string>>(content);
    const recordCount = parseResult.records.length;

    fileLogger.info('File parsed', { recordCount, hasTrailer: !!parseResult.trailer });

    // Update batch record with token count now that we've parsed the file
    await updateBatchStatus(fileId, 'PENDING', recordCount);

    // Insert audit log
    await insertAuditLog(fileId, null, AuditMessageCodes.FILE_RECEIVED,
      `File received: ${fileName}`, { recordCount, sourceId, tokenType });

    // Load records to staging table
    await loadMonerisTokensToStaging(parseResult.records, fileId, fileLogger);

    // Update batch record with load status
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
      context: contextType,
      sourceId,
      fileName,
    };
    await queueValidateTokens(validateMessage);

    fileLogger.info('File processing completed, queued for validation');

  } catch (error) {
    logger.error('Failed to process uploaded file', error, { blobPath });
    throw error;
  }
}

/**
 * Load Moneris tokens to staging table using BULK INSERT
 */
async function loadMonerisTokensToStaging(
  records: Record<string, string>[],
  fileId: string,
  logger: Logger
): Promise<void> {
  const tokens = records.map((row) => {
    const record = mapCsvRowToMonerisToken(row);
    return toMonerisTokenStaging(record, fileId);
  });

  // Map to bulk insert format
  const rows = tokens.map((t) => ({
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
  }));

  const columns = [
    'FILE_ID', 'BATCH_ID', 'MONERIS_TOKEN', 'EXP_DATE', 'ENTITY_ID', 'ENTITY_TYPE', 'ENTITY_STS',
    'CREATION_DATE', 'LAST_USE_DATE', 'TRX_SEQ_NO', 'BUSINESS_UNIT', 'VALIDATION_STATUS',
    'MIGRATION_STATUS', 'ERROR_CODE', 'PMR', 'UPDATED_BY', 'USAGE_TYPE'
  ];

  logger.info('Bulk inserting Moneris tokens', { count: rows.length });
  const insertedCount = await bulkInsertValues('MONERIS_TOKENS_STAGING', columns, rows);
  logger.info('Moneris tokens loaded to staging', { insertedCount });
}

/**
 * Handle Mastercard response file processing using BULK INSERT
 * Parses the MC response CSV and inserts PG tokens to staging
 * Per DDD: "Assign File id to the uploaded tokens and insert record to: TOKEN_MIGRATION_BATCH"
 */
async function handleMastercardResponse(
  fileName: string,
  content: string,
  logger: Logger
): Promise<void> {
  // Extract file ID from filename: FILE_xxxx.mc.response or SOURCE.TYPE.DATE.SEQ.mc.response
  let fileId: string = '';
  const baseFileName = fileName.replace('.mc.response', '');

  // Parse the filename to get metadata
  // For MC response files like V21.P.20260114.0001.mc.response, after stripping .mc.response
  // we get V21.P.20260114.0001 - we need to parse this directly
  let sourceId = 'UNKNOWN';
  let tokenType = 'P';

  // Try to parse the MC response base filename (SOURCE.TYPE.DATE.SEQ format without extension)
  const mcResponseMatch = baseFileName.match(/^([A-Z0-9]+)\.([PTI])\.(\d{8})\.(\d{4})$/i);
  if (mcResponseMatch) {
    sourceId = mcResponseMatch[1].toUpperCase();
    tokenType = mcResponseMatch[2].toUpperCase();
    const date = mcResponseMatch[3];
    const sequence = mcResponseMatch[4];
    fileId = `${sourceId}.${tokenType}.${date}.${sequence}`;
    logger.info('Parsed MC response filename', { fileName, fileId, sourceId, tokenType });
  } else if (fileName.startsWith('FILE_')) {
    // Format: FILE_1234567890.mc.response (legacy/fallback format)
    fileId = baseFileName;
    logger.warn('MC response uses FILE_ format', { fileName });
  } else {
    // Fallback: use the filename itself
    logger.warn('Could not parse MC response filename, using as-is', { fileName, baseFileName });
    fileId = baseFileName;
  }

  const fileLogger = logger.withFileId(fileId);
  fileLogger.info('Processing MC response file', { fileName, fileId });

  // Parse CSV content
  const parseResult = parseCsv<Record<string, string>>(content);
  const recordCount = parseResult.records.length;

  fileLogger.info('MC response parsed', { recordCount });

  // Per DDD: "Assign File id to the uploaded tokens and insert record to: TOKEN_MIGRATION_BATCH"
  // Create batch record for MC response file (Bug #43 fix)
  const blobPath = `mastercard-mapping/${fileName}`;
  await createFileBatchRecord(fileId, fileName, sourceId, tokenType, recordCount, blobPath, 'PROCESSING');

  // Insert audit log
  await insertAuditLog(fileId, null, 'MC_RESP_RECV',
    `Mastercard response received: ${fileName}`, { recordCount, sourceId, tokenType });

  // Map to bulk insert format
  const rows = parseResult.records.map((row) => {
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

  const columns = [
    'FILE_ID', 'MONERIS_TOKEN', 'PG_TOKEN', 'CARD_NUMBER_MASKED', 'FIRST_SIX', 'LAST_FOUR',
    'FUNDING_METHOD', 'EXP_MONTH', 'EXP_YEAR', 'ERROR_CAUSE', 'ERROR_EXPLANATION', 'ERROR_FIELD',
    'ERROR_SUPPORT_CODE', 'MIGRATION_STATUS', 'NETWORK_TOKEN_STATUS', 'CC_CARD_BRAND', 'CC_EXP_DATE',
    'APIOPERATION', 'PAYMENT_METHOD_TYPE', 'SOURCEOFFUNDS_TYPE', 'SOURCEOFFUNDS_NUMBER',
    'MONERIS_EXPIRY_MONTH', 'MONERIS_EXPIRY_YEAR', 'MONERIS2PG_MIGRATION_STATUS'
  ];

  fileLogger.info('Bulk inserting PG tokens', { count: rows.length });
  const insertedCount = await bulkInsertValues('PG_TOKENS_STAGING', columns, rows);
  fileLogger.info('PG tokens loaded to staging', { insertedCount });

  // Insert audit log for successful load
  await insertAuditLog(fileId, null, 'MC_RESP_LOAD',
    `Mastercard response loaded: ${insertedCount} tokens`, { insertedCount });

  // Now that PG tokens are loaded, queue batch manager to start processing
  // Since we created the batch record above, we have all the info we need
  const batchManagerMessage: BatchManagerMessage = {
    fileId,
    sourceId,
    totalBatches: 1, // Initial value, will be recalculated by createBatch function
  };

  await queueBatchManager(batchManagerMessage);
  fileLogger.info('PG tokens loaded, queued for batch management', {
    fileId,
    sourceId,
    pgTokenCount: insertedCount
  });
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
      batchId: fileId, // For file-level record, batchId = fileId
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

// Register the function for billing input
app.storageBlob('uploadFileBilling', {
  path: 'billing-input/{source}/{name}',
  connection: 'AzureWebJobsStorage',
  handler: uploadFileHandler,
});

// Register the function for Mastercard mapping response
app.storageBlob('uploadFileMastercard', {
  path: 'mastercard-mapping/{name}',
  connection: 'AzureWebJobsStorage',
  handler: uploadFileHandler,
});

export { uploadFileHandler };
