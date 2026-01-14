import { app, InvocationContext, Timer } from '@azure/functions';
import { getPool, updateBatchStatus } from '../services/database';
import { sendToGenerateOutputQueue } from '../services/queueService';

interface FileStatus {
  FILE_ID: string;
  FILE_NAME: string;
  SOURCE_ID: string;
  STATUS: string;
  TOTAL_RECORDS: number;
  VALID_RECORDS: number;
  INVALID_RECORDS: number;
  UPLOADED_AT: Date;
  TOTAL_BATCHES: number;
  COMPLETED_BATCHES: number;
  FAILED_BATCHES: number;
  PENDING_BATCHES: number;
  SUCCESS_COUNT: number;
  FAILURE_COUNT: number;
}

/**
 * Audit Control Function for Delta Migration
 * Timer triggered - monitors batches, triggers retries, sends completion notifications
 */
export async function auditControlDelta(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('Delta Migration - Audit control check started');

  try {
    // Get all files currently being processed
    const filesInProgress = await getFilesInProgress();

    context.log(`Files in progress: ${filesInProgress.length}`);

    for (const file of filesInProgress) {
      await processFileStatus(file, context);
    }

    // Check for stale batches (running for too long)
    await checkStaleBatches(context);

    context.log('Delta Migration - Audit control check completed');

  } catch (error) {
    context.error('Audit control failed:', error);
    throw error;
  }
}

/**
 * Get files currently in progress
 */
async function getFilesInProgress(): Promise<FileStatus[]> {
  const db = await getPool();

  const result = await db.request().query(`
    SELECT
      f.FILE_ID,
      f.FILE_NAME,
      f.SOURCE_ID,
      f.STATUS,
      f.TOTAL_RECORDS,
      f.VALID_RECORDS,
      f.INVALID_RECORDS,
      f.UPLOADED_AT,
      ISNULL(batch_stats.total_batches, 0) as TOTAL_BATCHES,
      ISNULL(batch_stats.completed_batches, 0) as COMPLETED_BATCHES,
      ISNULL(batch_stats.failed_batches, 0) as FAILED_BATCHES,
      ISNULL(batch_stats.pending_batches, 0) as PENDING_BATCHES,
      ISNULL(token_stats.success_count, 0) as SUCCESS_COUNT,
      ISNULL(token_stats.failure_count, 0) as FAILURE_COUNT
    FROM TOKEN_MIGRATION_BATCH f
    LEFT JOIN (
      SELECT
        FILE_ID,
        COUNT(*) as total_batches,
        SUM(CASE WHEN STATUS = 'COMPLETED' THEN 1 ELSE 0 END) as completed_batches,
        SUM(CASE WHEN STATUS = 'FAILED' THEN 1 ELSE 0 END) as failed_batches,
        SUM(CASE WHEN STATUS IN ('PENDING', 'PROCESSING') THEN 1 ELSE 0 END) as pending_batches
      FROM DELTA_MIGRATION_BATCH
      GROUP BY FILE_ID
    ) batch_stats ON f.FILE_ID = batch_stats.FILE_ID
    LEFT JOIN (
      SELECT
        FILE_ID,
        SUM(CASE WHEN MIGRATION_STATUS = 'COMPLETED' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN MIGRATION_STATUS = 'FAILED' THEN 1 ELSE 0 END) as failure_count
      FROM MONERIS_TOKENS_STAGING
      GROUP BY FILE_ID
    ) token_stats ON f.FILE_ID = token_stats.FILE_ID
    WHERE f.STATUS = 'PROCESSING'
      AND f.FILE_TYPE = 'DELTA'
  `);

  return result.recordset;
}

/**
 * Process file status and determine if completed
 */
async function processFileStatus(file: FileStatus, context: InvocationContext): Promise<void> {
  context.log(`Checking file status: ${file.FILE_ID}`, {
    totalBatches: file.TOTAL_BATCHES,
    completed: file.COMPLETED_BATCHES,
    failed: file.FAILED_BATCHES,
    pending: file.PENDING_BATCHES,
  });

  // Check if all batches are complete (no pending)
  if (file.PENDING_BATCHES === 0 && file.TOTAL_BATCHES > 0) {
    // All batches processed - update file status and generate output
    await completeFileMigration(file, context);
  }
}

/**
 * Complete file migration
 */
async function completeFileMigration(file: FileStatus, context: InvocationContext): Promise<void> {
  context.log(`All batches completed for file ${file.FILE_ID}, finalizing migration`);

  const db = await getPool();

  const hasFailures = file.FAILED_BATCHES > 0 || file.FAILURE_COUNT > 0;
  const finalStatus = hasFailures && file.SUCCESS_COUNT === 0 ? 'FAILED' : 'COMPLETED';

  // Update file record
  await db.request()
    .input('fileId', file.FILE_ID)
    .input('status', finalStatus)
    .query(`
      UPDATE TOKEN_MIGRATION_BATCH
      SET STATUS = @status,
          PROCESSED_AT = GETUTCDATE(),
          UPDATED_AT = GETUTCDATE()
      WHERE FILE_ID = @fileId
    `);

  // Insert audit log
  await insertAuditLog(
    file.FILE_ID,
    null,
    'MIGRATION_COMPLETED',
    `Delta migration completed: ${file.SUCCESS_COUNT} success, ${file.FAILURE_COUNT} failures`,
    { successCount: file.SUCCESS_COUNT, failureCount: file.FAILURE_COUNT, status: finalStatus }
  );

  // Queue billing file generation if we have successful tokens
  if (file.SUCCESS_COUNT > 0) {
    await sendToGenerateOutputQueue({
      fileId: file.FILE_ID,
      sourceId: file.SOURCE_ID,
      fileName: file.FILE_NAME,
    });
    context.log(`Queued output generation for file ${file.FILE_ID}`);
  }

  context.log(`Migration finalized: ${finalStatus}`, {
    successCount: file.SUCCESS_COUNT,
    failureCount: file.FAILURE_COUNT,
  });
}

/**
 * Check for stale batches
 */
async function checkStaleBatches(context: InvocationContext): Promise<void> {
  const db = await getPool();

  // Find batches that have been processing for more than 30 minutes
  const staleThresholdMinutes = 30;

  const result = await db.request()
    .input('threshold', staleThresholdMinutes)
    .query(`
      SELECT BATCH_ID, FILE_ID, CREATED_AT
      FROM DELTA_MIGRATION_BATCH
      WHERE STATUS = 'PROCESSING'
        AND CREATED_AT < DATEADD(MINUTE, -@threshold, GETUTCDATE())
    `);

  const staleBatches = result.recordset;

  if (staleBatches.length > 0) {
    context.warn(`Found ${staleBatches.length} stale batches`);

    for (const batch of staleBatches) {
      context.warn(`Stale batch detected: ${batch.BATCH_ID}`);

      // Mark as failed
      await updateBatchStatus(batch.BATCH_ID, 'FAILED', 0, 0, 0);

      // Insert audit log
      await insertAuditLog(
        batch.FILE_ID,
        batch.BATCH_ID,
        'BATCH_TIMEOUT',
        'Batch marked as failed due to timeout',
        { staleThresholdMinutes },
        'ERROR'
      );
    }
  }
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
  const db = await getPool();

  await db.request()
    .input('fileId', fileId)
    .input('batchId', batchId)
    .input('messageCode', messageCode)
    .input('messageText', messageText)
    .input('additionalInfo', additionalInfo ? JSON.stringify(additionalInfo) : null)
    .input('logLevel', logLevel)
    .query(`
      INSERT INTO TOKEN_MIGRATION_AUDIT_LOG
      (FILE_ID, BATCH_ID, MESSAGE_CODE, MESSAGE_TEXT, ADDITIONAL_INFO, LOG_LEVEL, CREATED_AT)
      VALUES (@fileId, @batchId, @messageCode, @messageText, @additionalInfo, @logLevel, GETUTCDATE())
    `);
}

// Register the function - runs every 5 minutes
app.timer('auditControlDelta', {
  schedule: '0 */5 * * * *', // Every 5 minutes
  handler: auditControlDelta,
});

export { auditControlDelta as handler };
