import { app, InvocationContext } from '@azure/functions';
import { getPool, insertPgTokenResults, updateBatchStatus, updateTokenMigrationStatus } from '../services/database';
import { sendToGenerateOutputQueue, BatchWorkerMessage } from '../services/queueService';
import { getPgTokenizationClient } from '../services/pgTokenizationClient';
import { MonerisToken } from '../models/monerisToken';

/**
 * Queue trigger function to process a batch of tokens
 * Calls PG Tokenization service (CDE) for each batch
 * This is the key difference from mass-migration: real-time API calls instead of file-based batch
 */
export async function batchWorkerDelta(
  message: BatchWorkerMessage,
  context: InvocationContext
): Promise<void> {
  const { batchId, fileId, sourceId, tokenIds } = message;

  context.log(`Delta Migration - Processing batch: ${batchId} with ${tokenIds.length} tokens`);

  try {
    const db = await getPool();
    const pgClient = getPgTokenizationClient();

    // Update batch status to processing
    await updateBatchStatus(batchId, 'PROCESSING', 0, 0, 0);

    // Get token details
    const idList = tokenIds.join(',');
    const tokensResult = await db.request()
      .query(`
        SELECT ID as id, FILE_ID as fileId, MONERIS_TOKEN as monerisToken, EXP_DATE as expDate,
               ENTITY_ID as entityId, ENTITY_TYPE as entityType, ENTITY_STATUS as entityStatus
        FROM MONERIS_TOKENS_STAGING
        WHERE ID IN (${idList})
      `);

    const tokens: MonerisToken[] = tokensResult.recordset;
    context.log(`Loaded ${tokens.length} tokens for processing`);

    // Call PG Tokenization service (batch mode)
    const response = await pgClient.tokenizeBatch(batchId, tokens);

    context.log(`Batch ${batchId} response: Success=${response.successCount}, Errors=${response.errorCount}`);

    // Insert PG token results
    await insertPgTokenResults(fileId, response.results);

    // Update individual token statuses
    for (const result of response.results) {
      const token = tokens.find(t => t.entityId === result.correlationId);
      if (token && token.id) {
        const status = result.result === 'SUCCESS' ? 'COMPLETED' : 'FAILED';
        await updateTokenMigrationStatus([token.id], status, batchId);
      }
    }

    // Update batch status
    await updateBatchStatus(
      batchId,
      'COMPLETED',
      response.totalRecords,
      response.successCount,
      response.errorCount
    );

    // Check if all batches for this file are complete
    const pendingBatches = await db.request()
      .input('fileId', fileId)
      .query(`
        SELECT COUNT(*) as count FROM DELTA_MIGRATION_BATCH
        WHERE FILE_ID = @fileId AND STATUS NOT IN ('COMPLETED', 'FAILED')
      `);

    if (pendingBatches.recordset[0].count === 0) {
      context.log(`All batches complete for file ${fileId}, queueing output generation`);

      // Update file status
      await db.request()
        .input('fileId', fileId)
        .query(`UPDATE TOKEN_MIGRATION_BATCH SET STATUS = 'COMPLETED', PROCESSED_AT = GETUTCDATE() WHERE FILE_ID = @fileId`);

      // Queue output file generation
      const fileResult = await db.request()
        .input('fileId', fileId)
        .query(`SELECT FILE_NAME FROM TOKEN_MIGRATION_BATCH WHERE FILE_ID = @fileId`);

      const fileName = fileResult.recordset[0]?.FILE_NAME || 'output.csv';
      await sendToGenerateOutputQueue({ fileId, sourceId, fileName });
    }

  } catch (error) {
    context.error(`Error processing batch ${batchId}:`, error);

    // Update batch status to failed
    await updateBatchStatus(batchId, 'FAILED', 0, 0, tokenIds.length);

    // Update token statuses to failed
    await updateTokenMigrationStatus(tokenIds, 'FAILED', batchId);

    throw error;
  }
}

app.storageQueue('batchWorkerDelta', {
  queueName: 'delta-batch-worker',
  connection: 'AzureWebJobsStorage',
  handler: batchWorkerDelta,
});
