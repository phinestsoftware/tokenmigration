// Initialize Dynatrace tracing before other imports
import '../index.js';

import { app, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { createLogger, Logger } from '../utils/logger.js';
import { executeQuery, executeProcedureWithOutput } from '../services/database.js';
import { decodeQueueMessage, BatchWorkerMessage } from '../services/queueService.js';
import { AuditMessageCodes } from '../models/migrationBatch.js';


/**
 * Batch Worker Function
 * Queue triggered - processes a single batch of tokens
 */
async function batchWorkerHandler(
  queueItem: unknown,
  context: InvocationContext
): Promise<void> {
  const message = decodeQueueMessage<BatchWorkerMessage>(queueItem as string);
  const { batchId, fileId, sourceId, batchNumber, migrationType } = message;

  const logger: Logger = createLogger('batchWorker', context, { fileId, batchId });

  logger.info('Starting batch processing', { batchId, batchNumber, migrationType });

  // Create worker record
  const workerId = `worker-${uuidv4().substring(0, 8)}`;

  try {
    await createWorkerRecord(workerId, batchId, fileId, 'WORKER');

    // Update batch status to processing
    await updateBatchStatus(batchId, 'PROCESSING');

    // Insert audit log
    await insertAuditLog(fileId, batchId, AuditMessageCodes.BATCH_STARTED,
      `Batch ${batchNumber} processing started`, { batchNumber });

    let successCount = 0;
    let failureCount = 0;

    // For Mass Migration, call the optimized stored procedure
    // All processing happens in SQL - single round-trip, no data transfer
    if (migrationType === 'MASS') {
      const result = await processMassMigrationBatchSQL(batchId, fileId, logger);
      successCount = result.successCount;
      failureCount = result.failureCount;
    } else {
      // Delta migration would call SSG/RTMM here
      logger.info('Delta migration not implemented in this version');
    }

    // Update batch status to completed
    await updateBatchStatus(batchId, 'COMPLETED', successCount, failureCount);

    // Update worker status
    await updateWorkerStatus(workerId, 'COMPLETED', successCount + failureCount);

    // Insert audit log
    await insertAuditLog(fileId, batchId, AuditMessageCodes.BATCH_COMPLETED,
      `Batch ${batchNumber} completed: ${successCount} success, ${failureCount} failures`,
      { batchNumber, successCount, failureCount });

    logger.info('Batch processing completed', {
      batchId,
      successCount,
      failureCount,
    });

  } catch (error) {
    logger.error('Batch processing failed', error);

    // Update batch status to failed
    await updateBatchStatus(batchId, 'FAILED');
    await updateWorkerStatus(workerId, 'FAILED', 0);

    // Insert audit log
    await insertAuditLog(fileId, batchId, AuditMessageCodes.BATCH_FAILED,
      `Batch ${batchNumber} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { batchNumber, error: error instanceof Error ? error.message : 'Unknown' }, 'ERROR');

    throw error;
  }
}

/**
 * Process Mass Migration batch using SQL stored procedure
 * All processing happens in the database - no data transfer to Azure Function
 *
 * The stored procedure SP_PROCESS_BATCH:
 * 1. Joins MONERIS_TOKENS_STAGING with PG_TOKENS_STAGING
 * 2. Computes PMR (Payment Method Reference) from PG token
 * 3. Inserts into PAYMENT_METHOD, TOKENIZED_CARD, ENTITY_DETAILS, ENTITY_PMR_MAPPING, PMR_MONERIS_MAPPING
 * 4. Updates MONERIS_TOKENS_STAGING with migration status
 * 5. Inserts error details for failures
 *
 * All done in a single transaction with a single database round-trip
 */
async function processMassMigrationBatchSQL(
  batchId: string,
  fileId: string,
  logger: Logger
): Promise<{ successCount: number; failureCount: number }> {
  logger.info('Calling SP_PROCESS_BATCH', { batchId, fileId });

  const startTime = Date.now();

  try {
    // Call the stored procedure with output parameters
    const result = await executeProcedureWithOutput<{ SuccessCount: number; FailureCount: number }>(
      'SP_PROCESS_BATCH',
      {
        BatchId: batchId,
        FileId: fileId,
      },
      {
        SuccessCount: { type: 'int', direction: 'output' },
        FailureCount: { type: 'int', direction: 'output' },
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('SP_PROCESS_BATCH completed', {
      batchId,
      successCount: result.SuccessCount,
      failureCount: result.FailureCount,
      durationSeconds: duration,
    });

    return {
      successCount: result.SuccessCount ?? 0,
      failureCount: result.FailureCount ?? 0,
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error('SP_PROCESS_BATCH failed', error, { batchId, durationSeconds: duration });
    throw error;
  }
}

/**
 * Create worker record
 */
async function createWorkerRecord(
  workerId: string,
  batchId: string,
  fileId: string,
  mode: string
): Promise<void> {
  await executeQuery(
    `INSERT INTO TOKEN_MIGRATION_WORKERS
     (WORKER_ID, BATCH_ID, FILE_ID, MODE, STATUS, STARTED_AT)
     VALUES (@workerId, @batchId, @fileId, @mode, 'RUNNING', GETUTCDATE())`,
    { workerId, batchId, fileId, mode }
  );
}

/**
 * Update worker status
 */
async function updateWorkerStatus(
  workerId: string,
  status: string,
  tokensProcessed: number
): Promise<void> {
  await executeQuery(
    `UPDATE TOKEN_MIGRATION_WORKERS
     SET STATUS = @status,
         TOKENS_PROCESSED = @tokensProcessed,
         COMPLETED_AT = GETUTCDATE(),
         UPDATED_AT = GETUTCDATE()
     WHERE WORKER_ID = @workerId`,
    { workerId, status, tokensProcessed }
  );
}

/**
 * Update batch status
 */
async function updateBatchStatus(
  batchId: string,
  status: string,
  successCount?: number,
  failureCount?: number
): Promise<void> {
  let query = `UPDATE TOKEN_MIGRATION_BATCH
               SET STATUS = @status, UPDATED_AT = GETUTCDATE()`;

  if (status === 'PROCESSING') {
    query += `, PROCESS_START_TIME = GETUTCDATE()`;
  }
  if (status === 'COMPLETED' || status === 'FAILED') {
    query += `, PROCESS_END_TIME = GETUTCDATE()`;
  }
  if (successCount !== undefined) {
    query += `, SUCCESS_COUNT = @successCount`;
  }
  if (failureCount !== undefined) {
    query += `, FAILURE_COUNT = @failureCount`;
  }

  query += ` WHERE BATCH_ID = @batchId`;

  await executeQuery(query, { batchId, status, successCount, failureCount });
}

/**
 * Insert audit log entry
 */
async function insertAuditLog(
  fileId: string | null,
  batchId: string | null,
  messageCode: string,
  messageText: string,
  additionalInfo?: Record<string, unknown>,
  logLevel: string = 'INFO'
): Promise<void> {
  await executeQuery(
    `INSERT INTO TOKEN_MIGRATION_AUDIT_LOG
     (FILE_ID, BATCH_ID, MESSAGE_CODE, MESSAGE_TEXT, ADDITIONAL_INFO, LOG_LEVEL)
     VALUES (@fileId, @batchId, @messageCode, @messageText, @additionalInfo, @logLevel)`,
    {
      fileId,
      batchId,
      messageCode,
      messageText,
      additionalInfo: additionalInfo ? JSON.stringify(additionalInfo) : null,
      logLevel,
    }
  );
}

// Register the function
app.storageQueue('batchWorker', {
  queueName: 'batch-worker-queue',
  connection: 'AzureWebJobsStorage',
  handler: batchWorkerHandler,
});

export { batchWorkerHandler };
