import { app, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../config/index.js';
import { createLogger, Logger } from '../utils/logger.js';
import { downloadBlob } from '../services/blobStorage.js';
import { executeQuery, bulkInsert, SqlTypes } from '../services/database.js';
import { queueValidateTokens, ValidateTokensMessage } from '../services/queueService.js';
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
    const container = pathParts[0];
    const fileName = pathParts[pathParts.length - 1];

    // Determine context (Moneris input or Mastercard response)
    const isMastercardResponse = container === 'mastercard-mapping' || blobPath.includes('mastercard/mapping');
    const contextType = isMastercardResponse ? 'PG' : 'MONERIS';

    // Generate file ID
    const fileId = generateFileId(fileName);
    const fileLogger = logger.withFileId(fileId);

    fileLogger.info('Processing file', { fileName, contextType, container });

    // Parse file metadata
    const parsedFileName = parseFileName(fileName);
    const sourceId = parsedFileName?.sourceId ?? 'UNKNOWN';
    const tokenType = parsedFileName?.tokenType ?? 'P';

    // Read and decode blob content
    const content = blobBuffer.toString('utf-8');

    // Validate file structure
    const expectedColumns = isMastercardResponse ? PgTokenCsvColumns : MonerisTokenCsvColumns;
    const validation = validateFileStructure(content, expectedColumns);

    if (!validation.isValid) {
      fileLogger.error('File validation failed', undefined, { errors: validation.errors });
      await insertAuditLog(fileId, null, AuditMessageCodes.FILE_REJECTED,
        `File validation failed: ${validation.errors.join(', ')}`, { errors: validation.errors });
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    // Parse CSV content
    const parseResult = parseCsv<Record<string, string>>(content);
    const recordCount = parseResult.records.length;

    fileLogger.info('File parsed', { recordCount, hasTrailer: !!parseResult.trailer });

    // Create batch record for the file
    await createFileBatchRecord(fileId, fileName, sourceId, tokenType, contextType, recordCount, blobPath);

    // Insert audit log
    await insertAuditLog(fileId, null, AuditMessageCodes.FILE_RECEIVED,
      `File received: ${fileName}`, { recordCount, sourceId, tokenType });

    // Load records to staging table
    if (isMastercardResponse) {
      await loadPgTokensToStaging(parseResult.records, fileId, fileLogger);
    } else {
      await loadMonerisTokensToStaging(parseResult.records, fileId, fileLogger);
    }

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
 * Load Moneris tokens to staging table
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

  const columns = [
    { name: 'FILE_ID', type: SqlTypes.varchar(50) },
    { name: 'MONERIS_TOKEN', type: SqlTypes.varchar(16) },
    { name: 'EXP_DATE', type: SqlTypes.varchar(4) },
    { name: 'ENTITY_ID', type: SqlTypes.varchar(36) },
    { name: 'ENTITY_TYPE', type: SqlTypes.char(1) },
    { name: 'ENTITY_STS', type: SqlTypes.char(1) },
    { name: 'CREATION_DATE', type: SqlTypes.date },
    { name: 'LAST_USE_DATE', type: SqlTypes.date },
    { name: 'TRX_SEQ_NO', type: SqlTypes.varchar(36) },
    { name: 'BUSINESS_UNIT', type: SqlTypes.varchar(20) },
    { name: 'VALIDATION_STATUS', type: SqlTypes.varchar(20) },
    { name: 'MIGRATION_STATUS', type: SqlTypes.varchar(20) },
    { name: 'UPDATED_BY', type: SqlTypes.varchar(50) },
  ];

  const rows = tokens.map((t) => ({
    FILE_ID: t.fileId,
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
    UPDATED_BY: t.updatedBy,
  }));

  const insertedCount = await bulkInsert('MONERIS_TOKENS_STAGING', columns, rows);
  logger.info('Moneris tokens loaded to staging', { insertedCount });
}

/**
 * Load PG tokens (Mastercard response) to staging table
 */
async function loadPgTokensToStaging(
  records: Record<string, string>[],
  fileId: string,
  logger: Logger
): Promise<void> {
  const tokens = records.map((row) => {
    const record = mapCsvRowToPgToken(row);
    return toPgTokenStaging(record, fileId);
  });

  const columns = [
    { name: 'FILE_ID', type: SqlTypes.varchar(50) },
    { name: 'MONERIS_TOKEN', type: SqlTypes.varchar(16) },
    { name: 'PG_TOKEN', type: SqlTypes.varchar(16) },
    { name: 'CARD_NUMBER_MASKED', type: SqlTypes.varchar(20) },
    { name: 'CARD_BRAND', type: SqlTypes.varchar(20) },
    { name: 'FIRST_SIX', type: SqlTypes.varchar(6) },
    { name: 'LAST_FOUR', type: SqlTypes.varchar(4) },
    { name: 'FUNDING_METHOD', type: SqlTypes.varchar(20) },
    { name: 'EXP_DATE', type: SqlTypes.varchar(4) },
    { name: 'EXP_MONTH', type: SqlTypes.varchar(2) },
    { name: 'EXP_YEAR', type: SqlTypes.varchar(2) },
    { name: 'RESULT', type: SqlTypes.varchar(20) },
    { name: 'ERROR_CAUSE', type: SqlTypes.varchar(50) },
    { name: 'ERROR_EXPLANATION', type: SqlTypes.varchar(255) },
    { name: 'MIGRATION_STATUS', type: SqlTypes.varchar(20) },
  ];

  const rows = tokens.map((t) => ({
    FILE_ID: t.fileId,
    MONERIS_TOKEN: t.monerisToken,
    PG_TOKEN: t.pgToken,
    CARD_NUMBER_MASKED: t.cardNumberMasked,
    CARD_BRAND: t.cardBrand,
    FIRST_SIX: t.firstSix,
    LAST_FOUR: t.lastFour,
    FUNDING_METHOD: t.fundingMethod,
    EXP_DATE: t.expDate,
    EXP_MONTH: t.expMonth,
    EXP_YEAR: t.expYear,
    RESULT: t.result,
    ERROR_CAUSE: t.errorCause,
    ERROR_EXPLANATION: t.errorExplanation,
    MIGRATION_STATUS: t.migrationStatus,
  }));

  const insertedCount = await bulkInsert('PG_TOKENS_STAGING', columns, rows);
  logger.info('PG tokens loaded to staging', { insertedCount });
}

/**
 * Create file batch record
 */
async function createFileBatchRecord(
  fileId: string,
  fileName: string,
  sourceId: string,
  tokenType: string,
  context: string,
  tokenCount: number,
  blobPath: string
): Promise<void> {
  await executeQuery(
    `INSERT INTO TOKEN_MIGRATION_BATCH
     (BATCH_ID, FILE_ID, FILE_NAME, SOURCE_ID, TOKEN_TYPE, MIGRATION_TYPE, CONTEXT,
      STATUS, TOTAL_TOKEN_COUNT, BLOB_PATH, FILE_TIMESTAMP)
     VALUES (@batchId, @fileId, @fileName, @sourceId, @tokenType, @migrationType, @context,
             @status, @tokenCount, @blobPath, GETUTCDATE())`,
    {
      batchId: fileId, // For file-level record, batchId = fileId
      fileId,
      fileName,
      sourceId,
      tokenType,
      migrationType: 'MASS',
      context,
      status: 'PENDING',
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
