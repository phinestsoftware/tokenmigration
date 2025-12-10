import { app, InvocationContext } from '@azure/functions';
import { getConfig } from '../config/index.js';
import { createLogger, Logger } from '../utils/logger.js';
import { executeQuery } from '../services/database.js';
import {
  queueCreateBatch,
  CreateBatchMessage,
  decodeQueueMessage,
  ValidateTokensMessage,
} from '../services/queueService.js';
import { sendValidationFailureEmail } from '../services/emailService.js';
import {
  validateMonerisToken,
  validateExpiryDate,
  validateEntityType,
  validateEntityStatus,
  isFailureThresholdExceeded,
  ValidationErrors,
} from '../services/validationService.js';
import { AuditMessageCodes } from '../models/migrationBatch.js';

interface TokenRecord {
  ID: number;
  MONERIS_TOKEN: string;
  EXP_DATE: string | null;
  ENTITY_ID: string | null;
  ENTITY_TYPE: string | null;
  ENTITY_STS: string | null;
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
 * Validate Moneris tokens
 */
async function validateMonerisTokens(
  fileId: string,
  sourceId: string,
  failureThreshold: number,
  logger: Logger
): Promise<void> {
  // Get all tokens for this file
  const result = await executeQuery<TokenRecord>(
    `SELECT ID, MONERIS_TOKEN, EXP_DATE, ENTITY_ID, ENTITY_TYPE, ENTITY_STS
     FROM MONERIS_TOKENS_STAGING
     WHERE FILE_ID = @fileId AND VALIDATION_STATUS = 'PENDING'`,
    { fileId }
  );

  const tokens = result.recordset;
  const totalCount = tokens.length;

  logger.info('Validating Moneris tokens', { totalCount });

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  // Track seen tokens for duplicate detection within file
  const seenTokens = new Set<string>();

  for (const token of tokens) {
    let status = 'VALID';
    let errorCode: string | null = null;

    // Check for duplicate within file
    if (seenTokens.has(token.MONERIS_TOKEN)) {
      status = 'DUPLICATE';
      errorCode = ValidationErrors.DUPLICATE_TOKEN;
      duplicateCount++;
    } else {
      seenTokens.add(token.MONERIS_TOKEN);

      // Validate token format
      const tokenValidation = validateMonerisToken(token.MONERIS_TOKEN);
      if (!tokenValidation.isValid) {
        status = 'INVALID';
        errorCode = tokenValidation.errorCode ?? null;
        invalidCount++;
      } else {
        // Validate expiry date
        const expiryValidation = validateExpiryDate(token.EXP_DATE);
        if (!expiryValidation.isValid) {
          status = 'INVALID';
          errorCode = expiryValidation.errorCode ?? null;
          invalidCount++;
        } else {
          // Validate entity type
          const entityTypeValidation = validateEntityType(token.ENTITY_TYPE);
          if (!entityTypeValidation.isValid) {
            status = 'INVALID';
            errorCode = entityTypeValidation.errorCode ?? null;
            invalidCount++;
          } else {
            // Validate entity status
            const entityStatusValidation = validateEntityStatus(token.ENTITY_STS);
            if (!entityStatusValidation.isValid) {
              status = 'INVALID';
              errorCode = entityStatusValidation.errorCode ?? null;
              invalidCount++;
            } else {
              validCount++;
            }
          }
        }
      }
    }

    // Update token status
    await executeQuery(
      `UPDATE MONERIS_TOKENS_STAGING
       SET VALIDATION_STATUS = @status, ERROR_CODE = @errorCode, UPDATED_AT = GETUTCDATE()
       WHERE ID = @id`,
      { id: token.ID, status, errorCode }
    );

    // Log error details if invalid
    if (status !== 'VALID') {
      await insertErrorDetails(fileId, null, token.MONERIS_TOKEN, token.ENTITY_ID, errorCode);
    }
  }

  // Check for duplicates in Payment Hub (existing tokens)
  const existingDuplicates = await checkExistingTokens(fileId, logger);
  duplicateCount += existingDuplicates;

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
    { validCount, invalidCount, duplicateCount, totalCount });

  logger.info('Validation stats', { validCount, invalidCount, duplicateCount, totalCount });

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
 * Validate PG tokens (Mastercard response)
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

  for (const token of tokens) {
    if (token.RESULT === 'SUCCESS' && token.PG_TOKEN) {
      validCount++;
      await executeQuery(
        `UPDATE PG_TOKENS_STAGING
         SET MIGRATION_STATUS = 'COMPLETED', UPDATED_AT = GETUTCDATE()
         WHERE ID = @id`,
        { id: token.ID }
      );
    } else {
      failureCount++;
      await executeQuery(
        `UPDATE PG_TOKENS_STAGING
         SET MIGRATION_STATUS = 'FAILED', UPDATED_AT = GETUTCDATE()
         WHERE ID = @id`,
        { id: token.ID }
      );
    }
  }

  logger.info('PG token validation completed', { validCount, failureCount });

  // Insert audit log
  await insertAuditLog(fileId, null, AuditMessageCodes.TOKEN_VALIDATED,
    `PG validation: ${validCount} success, ${failureCount} failures`,
    { validCount, failureCount });
}

/**
 * Check for existing tokens in Payment Hub
 */
async function checkExistingTokens(fileId: string, logger: Logger): Promise<number> {
  // Check PMR_MONERIS_MAPPING for existing tokens
  // In a real implementation, this would join with Payment Hub tables
  // For now, we'll simulate this check

  const result = await executeQuery<{ MONERIS_TOKEN: string }>(
    `SELECT m.MONERIS_TOKEN
     FROM MONERIS_TOKENS_STAGING m
     WHERE m.FILE_ID = @fileId
       AND m.VALIDATION_STATUS = 'VALID'
       AND EXISTS (
         SELECT 1 FROM MONERIS_TOKENS_STAGING existing
         WHERE existing.MONERIS_TOKEN = m.MONERIS_TOKEN
           AND existing.FILE_ID != @fileId
           AND existing.MIGRATION_STATUS = 'COMPLETED'
       )`,
    { fileId }
  );

  const duplicateTokens = result.recordset;

  if (duplicateTokens.length > 0) {
    // Mark as duplicates
    for (const token of duplicateTokens) {
      await executeQuery(
        `UPDATE MONERIS_TOKENS_STAGING
         SET VALIDATION_STATUS = 'DUPLICATE',
             ERROR_CODE = @errorCode,
             UPDATED_AT = GETUTCDATE()
         WHERE FILE_ID = @fileId AND MONERIS_TOKEN = @token`,
        { fileId, token: token.MONERIS_TOKEN, errorCode: ValidationErrors.DUPLICATE_IN_PHUB }
      );
    }

    logger.info('Found existing tokens in Payment Hub', { count: duplicateTokens.length });
  }

  return duplicateTokens.length;
}

/**
 * Insert error details
 */
async function insertErrorDetails(
  fileId: string,
  batchId: string | null,
  monerisToken: string,
  entityId: string | null,
  errorCode: string | null
): Promise<void> {
  await executeQuery(
    `INSERT INTO MIGRATION_ERROR_DETAILS
     (FILE_ID, BATCH_ID, MONERIS_TOKEN, ENTITY_ID, ERROR_CODE, ERROR_TYPE)
     VALUES (@fileId, @batchId, @monerisToken, @entityId, @errorCode, 'VALIDATION')`,
    { fileId, batchId, monerisToken, entityId, errorCode }
  );
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

// Register the function
app.storageQueue('validateTokens', {
  queueName: 'validate-tokens-queue',
  connection: 'AzureWebJobsStorage',
  handler: validateTokensHandler,
});

export { validateTokensHandler };
