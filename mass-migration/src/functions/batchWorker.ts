import { app, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { createLogger, Logger } from '../utils/logger.js';
import { executeQuery, bulkUpdate, bulkInsertValues } from '../services/database.js';
import { decodeQueueMessage, BatchWorkerMessage } from '../services/queueService.js';
import { AuditMessageCodes } from '../models/migrationBatch.js';

interface MonerisTokenForMigration {
  ID: number;
  MONERIS_TOKEN: string;
  EXP_DATE: string | null;
  ENTITY_ID: string | null;
  ENTITY_TYPE: string | null;
}

interface PgTokenForMigration {
  MONERIS_TOKEN: string;
  PG_TOKEN: string;
  CARD_BRAND: string | null;
  FIRST_SIX: string | null;
  LAST_FOUR: string | null;
  FUNDING_METHOD: string | null;
  RESULT: string;
}

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

    // For Mass Migration, we proceed directly to Payment Hub update
    // The MC response should already be loaded (either from file or mock)
    if (migrationType === 'MASS') {
      await processMassMigrationBatch(batchId, fileId, logger);
    } else {
      // Delta migration would call SSG/RTMM here
      logger.info('Delta migration not implemented in this version');
    }

    // Update batch status to completed
    const stats = await getBatchStats(batchId);
    await updateBatchStatus(batchId, 'COMPLETED', stats.successCount, stats.failureCount);

    // Update worker status
    await updateWorkerStatus(workerId, 'COMPLETED', stats.successCount + stats.failureCount);

    // Insert audit log
    await insertAuditLog(fileId, batchId, AuditMessageCodes.BATCH_COMPLETED,
      `Batch ${batchNumber} completed: ${stats.successCount} success, ${stats.failureCount} failures`,
      { batchNumber, successCount: stats.successCount, failureCount: stats.failureCount });

    logger.info('Batch processing completed', {
      batchId,
      successCount: stats.successCount,
      failureCount: stats.failureCount,
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
 * Process Mass Migration batch using BULK operations
 * For mass migration, we join Moneris tokens with PG tokens (from MC response) and update Payment Hub
 */
async function processMassMigrationBatch(
  batchId: string,
  fileId: string,
  logger: Logger
): Promise<void> {
  // Get Moneris tokens for this batch
  const monerisResult = await executeQuery<MonerisTokenForMigration>(
    `SELECT ID, MONERIS_TOKEN, EXP_DATE, ENTITY_ID, ENTITY_TYPE
     FROM MONERIS_TOKENS_STAGING
     WHERE BATCH_ID = @batchId`,
    { batchId }
  );

  const monerisTokens = monerisResult.recordset;

  logger.info('Processing batch tokens', { tokenCount: monerisTokens.length });

  // Get corresponding PG tokens from MC response
  const pgResult = await executeQuery<PgTokenForMigration>(
    `SELECT MONERIS_TOKEN, PG_TOKEN, CARD_BRAND, FIRST_SIX, LAST_FOUR, FUNDING_METHOD, RESULT
     FROM PG_TOKENS_STAGING
     WHERE FILE_ID = @fileId
       AND MONERIS_TOKEN IN (SELECT MONERIS_TOKEN FROM MONERIS_TOKENS_STAGING WHERE BATCH_ID = @batchId)`,
    { fileId, batchId }
  );

  // Create lookup map for PG tokens
  const pgTokenMap = new Map<string, PgTokenForMigration>();
  for (const pg of pgResult.recordset) {
    pgTokenMap.set(pg.MONERIS_TOKEN, pg);
  }

  logger.info('PG tokens found', { pgTokenCount: pgTokenMap.size });

  // Collect updates for bulk operations
  const successUpdates: { ID: number; MIGRATION_STATUS: string; PMR: string }[] = [];
  const failureUpdates: { ID: number; MIGRATION_STATUS: string; ERROR_CODE: string }[] = [];
  const errorDetails: {
    FILE_ID: string;
    BATCH_ID: string;
    MONERIS_TOKEN: string;
    ENTITY_ID: string | null;
    ERROR_CODE: string;
    ERROR_MESSAGE: string;
    ERROR_TYPE: string;
  }[] = [];

  // Process each token - collect updates but don't execute individually
  for (const moneris of monerisTokens) {
    const pgToken = pgTokenMap.get(moneris.MONERIS_TOKEN);

    if (pgToken && pgToken.RESULT === 'SUCCESS' && pgToken.PG_TOKEN) {
      // Generate PMR
      const pmr = generatePMR();

      // Collect success update
      successUpdates.push({
        ID: moneris.ID,
        MIGRATION_STATUS: 'COMPLETED',
        PMR: pmr,
      });

    } else {
      // Collect failure update
      const errorMessage = pgToken
        ? `MC response: ${pgToken.RESULT}`
        : 'No MC response found';

      failureUpdates.push({
        ID: moneris.ID,
        MIGRATION_STATUS: 'FAILED',
        ERROR_CODE: 'NO_PG_TOKEN',
      });

      // Collect error details for bulk insert
      errorDetails.push({
        FILE_ID: fileId,
        BATCH_ID: batchId,
        MONERIS_TOKEN: moneris.MONERIS_TOKEN,
        ENTITY_ID: moneris.ENTITY_ID,
        ERROR_CODE: 'NO_PG_TOKEN',
        ERROR_MESSAGE: errorMessage,
        ERROR_TYPE: 'MIGRATION',
      });
    }
  }

  // Execute bulk updates
  if (successUpdates.length > 0) {
    logger.info('Bulk updating successful tokens', { count: successUpdates.length });
    await bulkUpdate(
      'MONERIS_TOKENS_STAGING',
      'ID',
      successUpdates,
      ['MIGRATION_STATUS', 'PMR']
    );
  }

  if (failureUpdates.length > 0) {
    logger.info('Bulk updating failed tokens', { count: failureUpdates.length });
    await bulkUpdate(
      'MONERIS_TOKENS_STAGING',
      'ID',
      failureUpdates,
      ['MIGRATION_STATUS', 'ERROR_CODE']
    );
  }

  // Bulk insert error details
  if (errorDetails.length > 0) {
    logger.info('Bulk inserting error details', { count: errorDetails.length });
    await bulkInsertValues(
      'MIGRATION_ERROR_DETAILS',
      ['FILE_ID', 'BATCH_ID', 'MONERIS_TOKEN', 'ENTITY_ID', 'ERROR_CODE', 'ERROR_MESSAGE', 'ERROR_TYPE'],
      errorDetails
    );
  }

  logger.info('Batch processing completed', {
    successCount: successUpdates.length,
    failureCount: failureUpdates.length,
  });
}

/**
 * Generate PMR (Payment Method Reference)
 * Format: 16 digits starting with 8
 */
function generatePMR(): string {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `8${timestamp}${random}`;
}

/**
 * Update Payment Hub tables (simulated)
 * In real implementation, this would update:
 * - PAYMENT_METHOD
 * - TOKENIZED_CARD
 * - ENTITY_DETAILS
 * - ENTITY_PMR_MAPPING
 * - PMR_MONERIS_MAPPING
 * - TOKEN_ACTIVITY_LOG
 */
async function updatePaymentHub(
  moneris: MonerisTokenForMigration,
  pgToken: PgTokenForMigration,
  pmr: string
): Promise<void> {
  // This is a placeholder for actual Payment Hub updates
  // In the real implementation, you would insert/update records in:

  // 1. PMR_MONERIS_MAPPING - Link Moneris token to PMR and PG token
  // await executeQuery(
  //   `INSERT INTO PMR_MONERIS_MAPPING (PMR, MONERIS_TOKEN, PG_TOKEN, CREATED_AT)
  //    VALUES (@pmr, @monerisToken, @pgToken, GETUTCDATE())`,
  //   { pmr, monerisToken: moneris.MONERIS_TOKEN, pgToken: pgToken.PG_TOKEN }
  // );

  // 2. TOKENIZED_CARD - Store card details
  // 3. PAYMENT_METHOD - Create payment method record
  // 4. ENTITY_PMR_MAPPING - Link entity to PMR

  // For now, we just log that we would do this
  // The actual implementation depends on the Payment Hub schema
}

/**
 * Get batch statistics
 */
async function getBatchStats(batchId: string): Promise<{ successCount: number; failureCount: number }> {
  const result = await executeQuery<{ STATUS: string; COUNT: number }>(
    `SELECT MIGRATION_STATUS as STATUS, COUNT(*) as COUNT
     FROM MONERIS_TOKENS_STAGING
     WHERE BATCH_ID = @batchId
     GROUP BY MIGRATION_STATUS`,
    { batchId }
  );

  let successCount = 0;
  let failureCount = 0;

  for (const row of result.recordset) {
    if (row.STATUS === 'COMPLETED') {
      successCount = row.COUNT;
    } else if (row.STATUS === 'FAILED') {
      failureCount = row.COUNT;
    }
  }

  return { successCount, failureCount };
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
