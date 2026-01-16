import { app, InvocationContext } from '@azure/functions';
import { getConfig } from '../config/index.js';
import { createLogger, Logger } from '../utils/logger.js';
import { executeQuery } from '../services/database.js';
import {
  queueFileGen,
  FileGenMessage,
  decodeQueueMessage,
  CreateBatchMessage,
} from '../services/queueService.js';
import { AuditMessageCodes } from '../models/migrationBatch.js';

/**
 * Create Batch Function
 * Queue triggered - creates batch metadata based on validated tokens
 */
async function createBatchHandler(
  queueItem: unknown,
  context: InvocationContext
): Promise<void> {
  const message = decodeQueueMessage<CreateBatchMessage>(queueItem as string);
  const { fileId, sourceId } = message;

  const logger: Logger = createLogger('createBatch', context, { fileId });

  logger.info('Creating batch metadata', { fileId, sourceId });

  try {
    const config = getConfig();

    // Get batch size from config (source-specific or default)
    const batchSize = await getBatchSize(sourceId, config.DEFAULT_BATCH_SIZE);

    // Count valid tokens
    const countResult = await executeQuery<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM MONERIS_TOKENS_STAGING
       WHERE FILE_ID = @fileId AND VALIDATION_STATUS = 'VALID'`,
      { fileId }
    );

    const validTokenCount = countResult.recordset[0]?.count ?? 0;

    if (validTokenCount === 0) {
      logger.warn('No valid tokens to process');
      await updateBatchStatus(fileId, 'COMPLETED', 0, 0);
      return;
    }

    // Calculate number of batches
    const totalBatches = Math.ceil(validTokenCount / batchSize);

    logger.info('Batch calculation', { validTokenCount, batchSize, totalBatches });

    // Update file batch record with batch metadata
    await executeQuery(
      `UPDATE TOKEN_MIGRATION_BATCH
       SET BATCH_SIZE = @batchSize,
           TOTAL_BATCHES = @totalBatches,
           VALID_TOKEN_COUNT = @validTokenCount,
           PROCESS_START_TIME = GETUTCDATE(),
           UPDATED_AT = GETUTCDATE()
       WHERE FILE_ID = @fileId AND BATCH_ID = @fileId`,
      { fileId, batchSize, totalBatches, validTokenCount }
    );

    // Insert audit log
    await insertAuditLog(fileId, null, AuditMessageCodes.BATCH_CREATED,
      `Batch metadata created: ${totalBatches} batches of ${batchSize} tokens`,
      { totalBatches, batchSize, validTokenCount });

    // Queue file generation message
    const fileGenMessage: FileGenMessage = {
      fileId,
      sourceId,
      tokenCount: validTokenCount,
    };
    await queueFileGen(fileGenMessage);

    logger.info('Batch metadata created, queued for file generation');

  } catch (error) {
    logger.error('Failed to create batch metadata', error);

    await updateBatchStatus(fileId, 'FAILED');
    throw error;
  }
}

/**
 * Get batch size from config
 */
async function getBatchSize(sourceId: string, defaultSize: number): Promise<number> {
  try {
    const result = await executeQuery<{ CONFIG_VALUE: string }>(
      `SELECT CONFIG_VALUE FROM MIGRATION_CONFIG
       WHERE CONFIG_KEY = 'BATCH_SIZE'
         AND (SOURCE_ID = @sourceId OR SOURCE_ID IS NULL)
         AND IS_ACTIVE = 1
       ORDER BY CASE WHEN SOURCE_ID IS NOT NULL THEN 0 ELSE 1 END`,
      { sourceId }
    );

    if (result.recordset.length > 0 && result.recordset[0].CONFIG_VALUE) {
      return parseInt(result.recordset[0].CONFIG_VALUE, 10);
    }
  } catch {
    // Use default on error
  }

  return defaultSize;
}

/**
 * Update batch status
 */
async function updateBatchStatus(
  fileId: string,
  status: string,
  successCount?: number,
  failureCount?: number
): Promise<void> {
  let query = `UPDATE TOKEN_MIGRATION_BATCH
               SET STATUS = @status, UPDATED_AT = GETUTCDATE()`;

  if (successCount !== undefined) {
    query += `, SUCCESS_COUNT = @successCount`;
  }
  if (failureCount !== undefined) {
    query += `, FAILURE_COUNT = @failureCount`;
  }

  query += ` WHERE FILE_ID = @fileId AND BATCH_ID = @fileId`;

  await executeQuery(query, { fileId, status, successCount, failureCount });
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
app.storageQueue('createBatch', {
  queueName: 'create-batch-queue',
  connection: 'AzureWebJobsStorage',
  handler: createBatchHandler,
});

export { createBatchHandler };
