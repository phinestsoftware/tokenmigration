import { app, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { getPool, getTokensForBatch, updateTokenMigrationStatus, insertBatch } from '../services/database';
import { sendToBatchWorkerQueue, CreateBatchMessage } from '../services/queueService';
import { getConfig } from '../config';
import { MigrationBatch } from '../models/migrationBatch';

/**
 * Queue trigger function to create batches and assign tokens
 * Splits tokens into batches of configured size (~500) and queues workers
 */
export async function createBatchDelta(
  message: CreateBatchMessage,
  context: InvocationContext
): Promise<void> {
  const { fileId, sourceId } = message;
  const config = getConfig();
  const batchSize = config.DEFAULT_BATCH_SIZE;

  context.log(`Delta Migration - Creating batches for file: ${fileId}, batch size: ${batchSize}`);

  try {
    const db = await getPool();

    // Get count of valid pending tokens
    const countResult = await db.request()
      .input('fileId', fileId)
      .query(`
        SELECT COUNT(*) as count FROM MONERIS_TOKENS_STAGING
        WHERE FILE_ID = @fileId AND VALIDATION_STATUS = 'VALID' AND MIGRATION_STATUS = 'PENDING'
      `);

    const totalTokens = countResult.recordset[0].count;
    context.log(`Total valid tokens to process: ${totalTokens}`);

    if (totalTokens === 0) {
      context.log('No tokens to process');
      return;
    }

    // Update file status
    await db.request()
      .input('fileId', fileId)
      .query(`UPDATE TOKEN_MIGRATION_BATCH SET STATUS = 'PROCESSING', UPDATED_AT = GETUTCDATE() WHERE FILE_ID = @fileId`);

    // Create batches
    let batchCount = 0;
    let processedCount = 0;

    while (processedCount < totalTokens) {
      const tokens = await getTokensForBatch(fileId, batchSize);

      if (tokens.length === 0) {
        break;
      }

      const batchId = `DELTA_${fileId}_BATCH_${batchCount + 1}_${uuidv4().substring(0, 8)}`;
      const tokenIds = tokens.map(t => t.id!);

      // Update tokens with batch assignment
      await updateTokenMigrationStatus(tokenIds, 'IN_PROGRESS', batchId);

      // Create batch record
      const batch: MigrationBatch = {
        batchId,
        fileId,
        sourceId,
        status: 'PENDING',
        totalTokens: tokens.length,
        processedTokens: 0,
        successCount: 0,
        errorCount: 0,
      };
      await insertBatch(batch);

      // Queue batch worker
      await sendToBatchWorkerQueue({
        batchId,
        fileId,
        sourceId,
        tokenIds,
      });

      batchCount++;
      processedCount += tokens.length;
      context.log(`Created batch ${batchId} with ${tokens.length} tokens`);
    }

    context.log(`Created ${batchCount} batches for file ${fileId}`);

  } catch (error) {
    context.error(`Error creating batches for file ${fileId}:`, error);
    throw error;
  }
}

app.storageQueue('createBatchDelta', {
  queueName: 'delta-create-batch',
  connection: 'AzureWebJobsStorage',
  handler: createBatchDelta,
});
