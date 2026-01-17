// Initialize Dynatrace tracing before other imports
import '../index.js';

import { app, InvocationContext } from '@azure/functions';
import { getConfig } from '../config/index.js';
import { createLogger, Logger } from '../utils/logger.js';
import { executeQuery, bulkUpdate, bulkInsertValues } from '../services/database.js';
import {
  queueCreateBatch,
  CreateBatchMessage,
  decodeQueueMessage,
  ValidateTokensMessage,
} from '../services/queueService.js';
import { sendValidationFailureEmail } from '../services/emailService.js';
import {
  isFailureThresholdExceeded,
  ValidationErrors,
} from '../services/validationService.js';
import { AuditMessageCodes } from '../models/migrationBatch.js';
import { checkExistingTokensInPaymentHub } from '../services/duplicateDetectionService.js';

// Error code to message mapping - matches validation done in SQL during bulk insert
const ERROR_CODE_MESSAGES: Record<string, string> = {
  'E001': 'Token must contain only digits',
  'E002': 'Token must be 16 digits',
  'E003': 'Moneris token must start with 9',
  'E005': 'Expiry date must be in MMYY format with valid month (01-12)',
  'E007': 'Duplicate token found in file',
  'E008': 'Duplicate token exists in Payment Hub',
  'E009': 'Entity type must be 1 (Account) or 2 (GUID)',
  'E010': 'Entity status must be O, S, N, or C',
  'E011': 'Usage type must be 1, 2, 3, or 4',
};

interface InvalidTokenRecord {
  ID: number;
  MONERIS_TOKEN: string;
  ENTITY_ID: string | null;
  ERROR_CODE: string | null;
}

/**
 * Validate Tokens Function
 * Queue triggered - validates tokens and checks for duplicates
 */
async function validateTokensHandler(
  queueItem: unknown,
  context: InvocationContext
): Promise<void> {
  const message = decodeQueueMessage<ValidateTokensMessage>(queueItem as string);
  const { fileId, context: tokenContext, sourceId, fileName } = message;

  const logger: Logger = createLogger('validateTokens', context, { fileId });

  logger.info('Starting token validation', { fileId, tokenContext, sourceId });

  try {
    const config = getConfig();
    const failureThreshold = config.FAILURE_THRESHOLD_PERCENT;

    if (tokenContext === 'MONERIS') {
      await validateMonerisTokens(fileId, sourceId, failureThreshold, logger);
    } else {
      await validatePgTokens(fileId, logger);
    }

    // Queue create batch message
    const createBatchMessage: CreateBatchMessage = { fileId, sourceId };
    await queueCreateBatch(createBatchMessage);

    logger.info('Token validation completed, queued for batch creation');

  } catch (error) {
    logger.error('Token validation failed', error);

    // Update batch status to failed
    await executeQuery(
      `UPDATE TOKEN_MIGRATION_BATCH
       SET STATUS = 'FAILED', UPDATED_AT = GETUTCDATE()
       WHERE FILE_ID = @fileId AND BATCH_ID = @fileId`,
      { fileId }
    );

    throw error;
  }
}

/**
 * Validate Moneris tokens - hybrid approach
 *
 * Field validation (E001-E003, E005, E009-E011) is done in SQL during bulk insert
 * This function handles:
 * 1. Inserting error messages for field validation failures (SQL set ERROR_CODE, we add ERROR_MESSAGE)
 * 2. Duplicate detection within file (E007)
 * 3. Duplicate detection in Payment Hub (E008)
 * 4. Count updates and failure threshold checks
 */
async function validateMonerisTokens(
  fileId: string,
  sourceId: string,
  failureThreshold: number,
  logger: Logger
): Promise<void> {
  // Step 1: Get counts and invalid records
  // Field validation was done in SQL during INSERT, so records have VALIDATION_STATUS set
  const countResult = await executeQuery<{ status: string; cnt: number }>(
    `SELECT VALIDATION_STATUS as status, COUNT(*) as cnt
     FROM MONERIS_TOKENS_STAGING
     WHERE FILE_ID = @fileId
     GROUP BY VALIDATION_STATUS`,
    { fileId }
  );

  let validCount = 0;
  let invalidCount = 0;
  for (const row of countResult.recordset) {
    if (row.status === 'VALID') validCount = row.cnt;
    else if (row.status === 'INVALID') invalidCount = row.cnt;
  }
  const totalCount = validCount + invalidCount;

  logger.info('Field validation counts from SQL', { validCount, invalidCount, totalCount });

  // Step 2: Insert error messages for INVALID records (SQL set ERROR_CODE, we add ERROR_MESSAGE)
  const invalidResult = await executeQuery<InvalidTokenRecord>(
    `SELECT ID, MONERIS_TOKEN, ENTITY_ID, ERROR_CODE
     FROM MONERIS_TOKENS_STAGING
     WHERE FILE_ID = @fileId AND VALIDATION_STATUS = 'INVALID'`,
    { fileId }
  );

  if (invalidResult.recordset.length > 0) {
    logger.info('Inserting error details for invalid records', { count: invalidResult.recordset.length });

    const errorDetails: {
      FILE_ID: string;
      BATCH_ID: string | null;
      MONERIS_TOKEN: string;
      ENTITY_ID: string | null;
      ERROR_CODE: string | null;
      ERROR_MESSAGE: string;
      ERROR_TYPE: string;
    }[] = invalidResult.recordset.map(token => ({
      FILE_ID: fileId,
      BATCH_ID: null,
      MONERIS_TOKEN: token.MONERIS_TOKEN,
      ENTITY_ID: token.ENTITY_ID,
      ERROR_CODE: token.ERROR_CODE,
      ERROR_MESSAGE: ERROR_CODE_MESSAGES[token.ERROR_CODE ?? ''] ?? 'Validation failed',
      ERROR_TYPE: 'VALIDATION',
    }));

    await bulkInsertValues(
      'MIGRATION_ERROR_DETAILS',
      ['FILE_ID', 'BATCH_ID', 'MONERIS_TOKEN', 'ENTITY_ID', 'ERROR_CODE', 'ERROR_MESSAGE', 'ERROR_TYPE'],
      errorDetails
    );
  }

  // Step 3: Detect duplicates within file using SQL window function
  // Find tokens that appear more than once among VALID records
  // Keep the first occurrence (min ID) as VALID, mark others as DUPLICATE
  logger.info('Detecting duplicates within file');

  const duplicateUpdateResult = await executeQuery<{ rowsAffected: number }>(
    `WITH DuplicateTokens AS (
       SELECT ID, MONERIS_TOKEN, ENTITY_ID,
              ROW_NUMBER() OVER (PARTITION BY MONERIS_TOKEN ORDER BY ID) as rn
       FROM MONERIS_TOKENS_STAGING
       WHERE FILE_ID = @fileId AND VALIDATION_STATUS = 'VALID'
     )
     UPDATE MONERIS_TOKENS_STAGING
     SET VALIDATION_STATUS = 'DUPLICATE',
         ERROR_CODE = 'E007',
         UPDATED_AT = GETUTCDATE()
     FROM MONERIS_TOKENS_STAGING m
     INNER JOIN DuplicateTokens d ON m.ID = d.ID
     WHERE d.rn > 1;

     SELECT @@ROWCOUNT as rowsAffected;`,
    { fileId }
  );

  const duplicatesInFile = duplicateUpdateResult.recordset[0]?.rowsAffected ?? 0;
  logger.info('Duplicates within file marked', { count: duplicatesInFile });

  // Insert error details for duplicates within file
  if (duplicatesInFile > 0) {
    const duplicateRecords = await executeQuery<{ MONERIS_TOKEN: string; ENTITY_ID: string | null }>(
      `SELECT MONERIS_TOKEN, ENTITY_ID
       FROM MONERIS_TOKENS_STAGING
       WHERE FILE_ID = @fileId AND VALIDATION_STATUS = 'DUPLICATE' AND ERROR_CODE = 'E007'`,
      { fileId }
    );

    const duplicateErrors = duplicateRecords.recordset.map(token => ({
      FILE_ID: fileId,
      BATCH_ID: null,
      MONERIS_TOKEN: token.MONERIS_TOKEN,
      ENTITY_ID: token.ENTITY_ID,
      ERROR_CODE: ValidationErrors.DUPLICATE_TOKEN,
      ERROR_MESSAGE: ERROR_CODE_MESSAGES['E007'],
      ERROR_TYPE: 'VALIDATION',
    }));

    await bulkInsertValues(
      'MIGRATION_ERROR_DETAILS',
      ['FILE_ID', 'BATCH_ID', 'MONERIS_TOKEN', 'ENTITY_ID', 'ERROR_CODE', 'ERROR_MESSAGE', 'ERROR_TYPE'],
      duplicateErrors
    );
  }

  // Update validCount after marking in-file duplicates
  validCount -= duplicatesInFile;

  // Step 4: Check for duplicates in Payment Hub (existing tokens)
  // This checks PMR_MONERIS_MAPPING table for tokens already migrated
  const existingDuplicates = await checkExistingTokensInPaymentHub(fileId, logger);

  // Total duplicates = in-file duplicates + Payment Hub duplicates
  const duplicateCount = duplicatesInFile + existingDuplicates;
  validCount -= existingDuplicates;

  const totalFailures = invalidCount + duplicateCount;

  // Update batch with validation stats
  await executeQuery(
    `UPDATE TOKEN_MIGRATION_BATCH
     SET VALID_TOKEN_COUNT = @validCount,
         FAILURE_COUNT = @failureCount,
         UPDATED_AT = GETUTCDATE()
     WHERE FILE_ID = @fileId AND BATCH_ID = @fileId`,
    { fileId, validCount, failureCount: totalFailures }
  );

  // Insert audit log
  await insertAuditLog(fileId, null, AuditMessageCodes.TOKEN_VALIDATED,
    `Validation completed: ${validCount} valid, ${invalidCount} invalid, ${duplicateCount} duplicates`,
    { validCount, invalidCount, duplicateCount, totalCount, duplicatesInFile, existingDuplicates });

  logger.info('Validation stats', { validCount, invalidCount, duplicateCount, totalCount, duplicatesInFile, existingDuplicates });

  // Check failure threshold
  if (isFailureThresholdExceeded(totalCount, totalFailures, failureThreshold)) {
    const failurePercent = (totalFailures / totalCount) * 100;

    logger.error('Failure threshold exceeded', undefined, {
      failurePercent,
      threshold: failureThreshold,
    });

    // Update batch status to failed
    await executeQuery(
      `UPDATE TOKEN_MIGRATION_BATCH
       SET STATUS = 'FAILED', UPDATED_AT = GETUTCDATE()
       WHERE FILE_ID = @fileId AND BATCH_ID = @fileId`,
      { fileId }
    );

    // Insert audit log
    await insertAuditLog(fileId, null, AuditMessageCodes.FILE_REJECTED,
      `File rejected: failure rate ${failurePercent.toFixed(2)}% exceeds threshold ${failureThreshold}%`,
      { failurePercent, threshold: failureThreshold });

    // Send failure email
    await sendValidationFailureEmail({
      fileId,
      fileName: '',
      sourceId,
      status: 'FAILED',
      totalTokens: totalCount,
      validTokens: validCount,
      failurePercent,
      threshold: failureThreshold,
    });

    throw new Error(`Validation failure threshold exceeded: ${failurePercent.toFixed(2)}%`);
  }
}

/**
 * Validate PG tokens (Mastercard response) using BULK operations
 */
async function validatePgTokens(fileId: string, logger: Logger): Promise<void> {
  // For PG tokens, mainly check that we have valid tokens and correlationIds
  const result = await executeQuery<{ ID: number; MONERIS_TOKEN: string; PG_TOKEN: string | null; RESULT: string }>(
    `SELECT ID, MONERIS_TOKEN, PG_TOKEN, RESULT
     FROM PG_TOKENS_STAGING
     WHERE FILE_ID = @fileId`,
    { fileId }
  );

  const tokens = result.recordset;
  let validCount = 0;
  let failureCount = 0;

  // Collect updates for bulk operation
  const successUpdates: { ID: number; MIGRATION_STATUS: string }[] = [];
  const failureUpdates: { ID: number; MIGRATION_STATUS: string }[] = [];

  for (const token of tokens) {
    if (token.RESULT === 'SUCCESS' && token.PG_TOKEN) {
      validCount++;
      successUpdates.push({ ID: token.ID, MIGRATION_STATUS: 'COMPLETED' });
    } else {
      failureCount++;
      failureUpdates.push({ ID: token.ID, MIGRATION_STATUS: 'FAILED' });
    }
  }

  // Execute bulk updates
  if (successUpdates.length > 0) {
    await bulkUpdate('PG_TOKENS_STAGING', 'ID', successUpdates, ['MIGRATION_STATUS']);
  }
  if (failureUpdates.length > 0) {
    await bulkUpdate('PG_TOKENS_STAGING', 'ID', failureUpdates, ['MIGRATION_STATUS']);
  }

  logger.info('PG token validation completed', { validCount, failureCount });

  // Insert audit log
  await insertAuditLog(fileId, null, AuditMessageCodes.TOKEN_VALIDATED,
    `PG validation: ${validCount} success, ${failureCount} failures`,
    { validCount, failureCount });
}

// Note: checkExistingTokens function moved to duplicateDetectionService.ts
// Issue #42 FIX: Now checks PMR_MONERIS_MAPPING instead of MONERIS_TOKENS_STAGING

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

// Register the function
app.storageQueue('validateTokens', {
  queueName: 'validate-tokens-queue',
  connection: 'AzureWebJobsStorage',
  handler: validateTokensHandler,
});

export { validateTokensHandler };
