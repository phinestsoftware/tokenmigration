// Initialize Dynatrace tracing before other imports
import '../index.js';

import { app, InvocationContext, Timer } from '@azure/functions';
import { createLogger, Logger } from '../utils/logger.js';
import { executeQuery } from '../services/database.js';
import { queueBillingFile, BillingFileMessage } from '../services/queueService.js';
import { sendMigrationCompleteEmail, sendMigrationFailureEmail } from '../services/emailService.js';
import { AuditMessageCodes } from '../models/migrationBatch.js';

interface FileStatus {
  FILE_ID: string;
  FILE_NAME: string;
  SOURCE_ID: string;
  STATUS: string;
  TOTAL_TOKEN_COUNT: number;
  VALID_TOKEN_COUNT: number;
  SUCCESS_COUNT: number;
  FAILURE_COUNT: number;
  PROCESS_START_TIME: Date | null;
  TOTAL_BATCHES: number;
  COMPLETED_BATCHES: number;
  FAILED_BATCHES: number;
  PENDING_BATCHES: number;
}

/**
 * Audit Control Function
 * Timer triggered - monitors batches, triggers retries, sends completion emails
 */
async function auditControlHandler(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const logger: Logger = createLogger('auditControl', context);

  logger.info('Audit control check started');

  try {
    // Get all files currently being processed
    const filesInProgress = await getFilesInProgress();

    logger.info('Files in progress', { count: filesInProgress.length });

    for (const file of filesInProgress) {
      await processFileStatus(file, logger);
    }

    // Check for stale batches (running for too long)
    await checkStaleBatches(logger);

    // Clean up old completed records (optional - for maintenance)
    // await cleanupOldRecords(logger);

    logger.info('Audit control check completed');

  } catch (error) {
    logger.error('Audit control failed', error);
    throw error;
  }
}

/**
 * Get files currently in progress
 */
async function getFilesInProgress(): Promise<FileStatus[]> {
  const result = await executeQuery<FileStatus>(`
    SELECT
      f.FILE_ID,
      f.FILE_NAME,
      f.SOURCE_ID,
      f.STATUS,
      f.TOTAL_TOKEN_COUNT,
      f.VALID_TOKEN_COUNT,
      ISNULL(f.SUCCESS_COUNT, 0) as SUCCESS_COUNT,
      ISNULL(f.FAILURE_COUNT, 0) as FAILURE_COUNT,
      f.PROCESS_START_TIME,
      ISNULL(f.TOTAL_BATCHES, 0) as TOTAL_BATCHES,
      ISNULL(completed.cnt, 0) as COMPLETED_BATCHES,
      ISNULL(failed.cnt, 0) as FAILED_BATCHES,
      ISNULL(pending.cnt, 0) as PENDING_BATCHES
    FROM TOKEN_MIGRATION_BATCH f
    LEFT JOIN (
      SELECT FILE_ID, COUNT(*) as cnt
      FROM TOKEN_MIGRATION_BATCH
      WHERE STATUS = 'COMPLETED' AND BATCH_ID != FILE_ID
      GROUP BY FILE_ID
    ) completed ON f.FILE_ID = completed.FILE_ID
    LEFT JOIN (
      SELECT FILE_ID, COUNT(*) as cnt
      FROM TOKEN_MIGRATION_BATCH
      WHERE STATUS = 'FAILED' AND BATCH_ID != FILE_ID
      GROUP BY FILE_ID
    ) failed ON f.FILE_ID = failed.FILE_ID
    LEFT JOIN (
      SELECT FILE_ID, COUNT(*) as cnt
      FROM TOKEN_MIGRATION_BATCH
      WHERE STATUS IN ('PENDING', 'PROCESSING') AND BATCH_ID != FILE_ID
      GROUP BY FILE_ID
    ) pending ON f.FILE_ID = pending.FILE_ID
    WHERE f.BATCH_ID = f.FILE_ID
      AND f.STATUS = 'PROCESSING'
  `);

  return result.recordset;
}

/**
 * Process file status and determine if completed
 */
async function processFileStatus(file: FileStatus, logger: Logger): Promise<void> {
  const fileLogger = logger.withFileId(file.FILE_ID);

  fileLogger.info('Checking file status', {
    totalBatches: file.TOTAL_BATCHES,
    completed: file.COMPLETED_BATCHES,
    failed: file.FAILED_BATCHES,
    pending: file.PENDING_BATCHES,
  });

  // Check if all batches are complete (no pending)
  if (file.PENDING_BATCHES === 0 && file.TOTAL_BATCHES > 0) {
    // All batches processed - update file status and generate output
    await completeFileMigration(file, fileLogger);
  }
}

/**
 * Complete file migration
 */
async function completeFileMigration(file: FileStatus, logger: Logger): Promise<void> {
  logger.info('All batches completed, finalizing migration');

  // Calculate final stats from tokens
  const statsResult = await executeQuery<{ STATUS: string; COUNT: number }>(
    `SELECT MIGRATION_STATUS as STATUS, COUNT(*) as COUNT
     FROM MONERIS_TOKENS_STAGING
     WHERE FILE_ID = @fileId
     GROUP BY MIGRATION_STATUS`,
    { fileId: file.FILE_ID }
  );

  let successCount = 0;
  let failureCount = 0;
  for (const row of statsResult.recordset) {
    if (row.STATUS === 'COMPLETED') successCount = row.COUNT;
    if (row.STATUS === 'FAILED') failureCount = row.COUNT;
  }

  const hasFailures = file.FAILED_BATCHES > 0 || failureCount > 0;
  const finalStatus = hasFailures && successCount === 0 ? 'FAILED' : 'COMPLETED';

  // Update file batch record
  await executeQuery(
    `UPDATE TOKEN_MIGRATION_BATCH
     SET STATUS = @status,
         SUCCESS_COUNT = @successCount,
         FAILURE_COUNT = @failureCount,
         PROCESS_END_TIME = GETUTCDATE(),
         UPDATED_AT = GETUTCDATE()
     WHERE FILE_ID = @fileId AND BATCH_ID = @fileId`,
    { fileId: file.FILE_ID, status: finalStatus, successCount, failureCount }
  );

  // Insert audit log
  await insertAuditLog(file.FILE_ID, null, AuditMessageCodes.BATCH_COMPLETED,
    `Migration completed: ${successCount} success, ${failureCount} failures`,
    { successCount, failureCount, status: finalStatus });

  // Queue billing file generation
  const billingMessage: BillingFileMessage = {
    sourceId: file.SOURCE_ID,
    fileId: file.FILE_ID,
  };
  await queueBillingFile(billingMessage);

  // Send email notification
  if (finalStatus === 'COMPLETED') {
    await sendMigrationCompleteEmail({
      fileId: file.FILE_ID,
      fileName: file.FILE_NAME ?? '',
      sourceId: file.SOURCE_ID,
      status: 'COMPLETED',
      totalTokens: file.TOTAL_TOKEN_COUNT,
      validTokens: file.VALID_TOKEN_COUNT,
      successCount,
      failureCount,
      startTime: file.PROCESS_START_TIME ?? undefined,
      endTime: new Date(),
    });
  } else {
    await sendMigrationFailureEmail({
      fileId: file.FILE_ID,
      fileName: file.FILE_NAME ?? '',
      sourceId: file.SOURCE_ID,
      status: 'FAILED',
      totalTokens: file.TOTAL_TOKEN_COUNT,
      validTokens: file.VALID_TOKEN_COUNT,
      successCount,
      failureCount,
      errorMessage: 'Some batches failed during processing',
    });
  }

  logger.info('Migration finalized', { status: finalStatus, successCount, failureCount });
}

/**
 * Check for stale batches
 */
async function checkStaleBatches(logger: Logger): Promise<void> {
  // Find batches that have been processing for more than 30 minutes
  const staleThresholdMinutes = 30;

  const result = await executeQuery<{ BATCH_ID: string; FILE_ID: string; PROCESS_START_TIME: Date }>(
    `SELECT BATCH_ID, FILE_ID, PROCESS_START_TIME
     FROM TOKEN_MIGRATION_BATCH
     WHERE STATUS = 'PROCESSING'
       AND BATCH_ID != FILE_ID
       AND PROCESS_START_TIME < DATEADD(MINUTE, -@threshold, GETUTCDATE())`,
    { threshold: staleThresholdMinutes }
  );

  const staleBatches = result.recordset;

  if (staleBatches.length > 0) {
    logger.warn('Found stale batches', { count: staleBatches.length });

    for (const batch of staleBatches) {
      logger.warn('Stale batch detected', {
        batchId: batch.BATCH_ID,
        fileId: batch.FILE_ID,
        startTime: batch.PROCESS_START_TIME,
      });

      // Mark as failed
      await executeQuery(
        `UPDATE TOKEN_MIGRATION_BATCH
         SET STATUS = 'FAILED',
             PROCESS_END_TIME = GETUTCDATE(),
             UPDATED_AT = GETUTCDATE()
         WHERE BATCH_ID = @batchId`,
        { batchId: batch.BATCH_ID }
      );

      // Insert audit log
      await insertAuditLog(batch.FILE_ID, batch.BATCH_ID, AuditMessageCodes.BATCH_FAILED,
        'Batch marked as failed due to timeout', { staleThresholdMinutes }, 'ERROR');
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

// Register the function - runs every 5 minutes
app.timer('auditControl', {
  schedule: '0 */5 * * * *', // Every 5 minutes
  handler: auditControlHandler,
});

export { auditControlHandler };
