// Initialize Dynatrace tracing before other imports
import '../index.js';

import { app, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../config/index.js';
import { createLogger, Logger } from '../utils/logger.js';
import { executeQuery } from '../services/database.js';
import {
  queueBatchWorker,
  BatchWorkerMessage,
  decodeQueueMessage,
  BatchManagerMessage,
} from '../services/queueService.js';
import { generateBatchId, AuditMessageCodes } from '../models/migrationBatch.js';

/**
 * Batch Manager Function
 * Queue triggered - assigns batch IDs to tokens and queues batch workers
 */
async function batchManagerHandler(
  queueItem: unknown,
  context: InvocationContext
): Promise<void> {
  const message = decodeQueueMessage<BatchManagerMessage>(queueItem as string);
  const { fileId, sourceId, totalBatches } = message;

  const logger: Logger = createLogger('batchManager', context, { fileId });

  logger.info('Starting batch management', { fileId, sourceId, totalBatches });

  try {
    const config = getConfig();

    // Get batch size from file record
    const batchInfoResult = await executeQuery<{ BATCH_SIZE: number; VALID_TOKEN_COUNT: number }>(
      `SELECT BATCH_SIZE, VALID_TOKEN_COUNT FROM TOKEN_MIGRATION_BATCH
       WHERE FILE_ID = @fileId AND BATCH_ID = @fileId`,
      { fileId }
    );

    const batchSize = batchInfoResult.recordset[0]?.BATCH_SIZE ?? config.DEFAULT_BATCH_SIZE;
    const validTokenCount = batchInfoResult.recordset[0]?.VALID_TOKEN_COUNT ?? 0;

    // Get all valid Moneris tokens that:
    // 1. Belong to this file
    // 2. Haven't been assigned to a batch yet
    // 3. Have corresponding PG tokens available (via MONERIS_TOKEN correlation)
    // Per DDD: correlationId in MC response = MONERIS_TOKEN, so join on MONERIS_TOKEN not FILE_ID
    const tokensResult = await executeQuery<{ ID: number; MONERIS_FILE_ID: string }>(
      `SELECT m.ID, m.FILE_ID as MONERIS_FILE_ID
       FROM MONERIS_TOKENS_STAGING m
       WHERE m.FILE_ID = @fileId
         AND m.VALIDATION_STATUS = 'VALID'
         AND m.BATCH_ID IS NULL
         AND EXISTS (
           SELECT 1 FROM PG_TOKENS_STAGING p
           WHERE p.MONERIS_TOKEN = m.MONERIS_TOKEN
             AND p.MONERIS2PG_MIGRATION_STATUS = 'SUCCESS'
         )
       ORDER BY m.ID`,
      { fileId }
    );

    const tokenIds = tokensResult.recordset.map((r) => r.ID);
    // Get the actual Moneris FILE_ID (billing input file) for batch creation
    const monerisFileId = tokensResult.recordset[0]?.MONERIS_FILE_ID ?? fileId;

    if (tokenIds.length === 0) {
      logger.info('No tokens to assign to batches');
      return;
    }

    logger.info('Assigning tokens to batches', {
      totalTokens: tokenIds.length,
      batchSize,
      expectedBatches: Math.ceil(tokenIds.length / batchSize),
      monerisFileId,
    });

    // Create worker record for this manager (use monerisFileId for proper linking)
    const workerId = `manager-${uuidv4().substring(0, 8)}`;
    await createWorkerRecord(workerId, monerisFileId, monerisFileId, 'MANAGER');

    let batchNumber = 0;
    let processedTokens = 0;

    // Process tokens in batches
    for (let i = 0; i < tokenIds.length; i += batchSize) {
      batchNumber++;
      const batchTokenIds = tokenIds.slice(i, i + batchSize);
      const batchId = generateBatchId(monerisFileId, batchNumber);

      logger.info('Creating batch', {
        batchId,
        batchNumber,
        tokenCount: batchTokenIds.length,
      });

      // Create batch record first (required for FK constraint)
      await createBatchRecord(monerisFileId, batchId, sourceId, batchNumber, totalBatches, batchTokenIds.length);

      // Update tokens with batch ID
      await assignTokensToBatch(batchTokenIds, batchId);

      // Insert audit log
      await insertAuditLog(monerisFileId, batchId, AuditMessageCodes.BATCH_CREATED,
        `Batch ${batchNumber} created with ${batchTokenIds.length} tokens`,
        { batchNumber, tokenCount: batchTokenIds.length });

      // Queue batch worker
      const batchWorkerMessage: BatchWorkerMessage = {
        batchId,
        fileId: monerisFileId,
        sourceId,
        batchNumber,
        migrationType: 'MASS',
      };
      await queueBatchWorker(batchWorkerMessage);

      processedTokens += batchTokenIds.length;
    }

    // Update worker status
    await updateWorkerStatus(workerId, 'COMPLETED', processedTokens);

    logger.info('Batch management completed', {
      totalBatches: batchNumber,
      totalTokens: processedTokens,
    });

  } catch (error) {
    logger.error('Batch management failed', error);

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
 * Assign tokens to a batch
 */
async function assignTokensToBatch(tokenIds: number[], batchId: string): Promise<void> {
  // Update in chunks to avoid parameter limits
  const chunkSize = 500;
  for (let i = 0; i < tokenIds.length; i += chunkSize) {
    const chunk = tokenIds.slice(i, i + chunkSize);
    const idList = chunk.join(',');

    await executeQuery(
      `UPDATE MONERIS_TOKENS_STAGING
       SET BATCH_ID = @batchId, UPDATED_AT = GETUTCDATE()
       WHERE ID IN (${idList})`,
      { batchId }
    );
  }
}

/**
 * Create batch record
 */
async function createBatchRecord(
  fileId: string,
  batchId: string,
  sourceId: string,
  batchNumber: number,
  totalBatches: number,
  tokenCount: number
): Promise<void> {
  // Derive FILE_NAME from FILE_ID (e.g., V21.P.20260105.6088 -> V21.P.20260105.6088.input)
  const fileName = `${fileId}.input`;

  await executeQuery(
    `INSERT INTO TOKEN_MIGRATION_BATCH
     (BATCH_ID, FILE_ID, FILE_NAME, SOURCE_ID, MIGRATION_TYPE, CONTEXT, STATUS,
      TOTAL_TOKEN_COUNT, BATCH_NUMBER, TOTAL_BATCHES, BATCH_SIZE)
     VALUES (@batchId, @fileId, @fileName, @sourceId, 'MASS', 'MassMigPG', 'PENDING',
             @tokenCount, @batchNumber, @totalBatches, @tokenCount)`,
    { batchId, fileId, fileName, sourceId, tokenCount, batchNumber, totalBatches }
  );
}

/**
 * Create worker record
 */
async function createWorkerRecord(
  workerId: string,
  fileId: string,
  batchId: string | null,
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
app.storageQueue('batchManager', {
  queueName: 'batch-manager-queue',
  connection: 'AzureWebJobsStorage',
  handler: batchManagerHandler,
});

export { batchManagerHandler };
