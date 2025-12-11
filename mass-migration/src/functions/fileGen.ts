import { app, InvocationContext } from '@azure/functions';
import { getConfig } from '../config/index.js';
import { createLogger, Logger } from '../utils/logger.js';
import { executeQuery } from '../services/database.js';
import { uploadBlob } from '../services/blobStorage.js';
import {
  queueBatchManager,
  BatchManagerMessage,
  decodeQueueMessage,
  FileGenMessage,
} from '../services/queueService.js';
import { generateMcInputFile, formatTimestamp } from '../utils/fileParser.js';
import { AuditMessageCodes, parseFileName } from '../models/migrationBatch.js';
import { triggerMockMastercardResponse } from '../services/mastercard/mockService.js';

interface TokenForMc {
  MONERIS_TOKEN: string;
  EXP_DATE: string | null;
}

/**
 * File Generation Function
 * Queue triggered - generates Mastercard input file from validated tokens
 */
async function fileGenHandler(
  queueItem: unknown,
  context: InvocationContext
): Promise<void> {
  const message = decodeQueueMessage<FileGenMessage>(queueItem as string);
  const { fileId, sourceId, tokenCount } = message;

  const logger: Logger = createLogger('fileGen', context, { fileId });

  logger.info('Starting file generation', { fileId, sourceId, tokenCount });

  try {
    const config = getConfig();

    // Get valid tokens from staging
    const result = await executeQuery<TokenForMc>(
      `SELECT MONERIS_TOKEN, EXP_DATE
       FROM MONERIS_TOKENS_STAGING
       WHERE FILE_ID = @fileId AND VALIDATION_STATUS = 'VALID'
       ORDER BY ID`,
      { fileId }
    );

    const tokens = result.recordset;

    if (tokens.length === 0) {
      logger.warn('No valid tokens to generate file for');
      return;
    }

    // Remove duplicates (by Moneris token)
    const uniqueTokens = removeDuplicates(tokens);

    logger.info('Generating MC input file', {
      totalTokens: tokens.length,
      uniqueTokens: uniqueTokens.length,
    });

    // Generate MC input file content
    const mcInputContent = generateMcInputFile(
      uniqueTokens.map((t) => ({
        monerisToken: t.MONERIS_TOKEN,
        expDate: t.EXP_DATE,
      })),
      sourceId,
      'WL' // Business unit
    );

    // Generate output file name
    const parsedFile = parseFileName(fileId);
    const mcFileName = parsedFile
      ? `${parsedFile.sourceId}.${parsedFile.tokenType}.${parsedFile.date}.${parsedFile.sequence}.mc.input`
      : `${fileId}.mc.input`;

    // Upload to mastercard-input container
    const blobInfo = await uploadBlob(
      config.MASTERCARD_INPUT_CONTAINER,
      mcFileName,
      mcInputContent
    );

    logger.info('MC input file uploaded', {
      fileName: mcFileName,
      container: config.MASTERCARD_INPUT_CONTAINER,
      size: blobInfo.contentLength,
    });

    // Update batch record with MC file info
    await executeQuery(
      `UPDATE TOKEN_MIGRATION_BATCH
       SET BLOB_PATH = @blobPath, UPDATED_AT = GETUTCDATE()
       WHERE FILE_ID = @fileId AND BATCH_ID = @fileId`,
      { fileId, blobPath: `${config.MASTERCARD_INPUT_CONTAINER}/${mcFileName}` }
    );

    // Insert audit log
    await insertAuditLog(fileId, null, AuditMessageCodes.OUTPUT_GENERATED,
      `MC input file generated: ${mcFileName}`,
      { fileName: mcFileName, tokenCount: uniqueTokens.length });

    // If mock mode is enabled, trigger mock MC response
    if (config.MOCK_MASTERCARD_ENABLED) {
      logger.info('Mock mode enabled, generating mock MC response');
      await triggerMockMastercardResponse(fileId, uniqueTokens, sourceId, config);

      // Wait for the blob trigger to process the MC response file
      // This ensures PG tokens are in staging before batchWorker runs
      logger.info('Waiting for MC response blob trigger to process...');
      const maxWaitMs = 30000; // 30 seconds max
      const pollIntervalMs = 2000; // Check every 2 seconds
      let waited = 0;

      while (waited < maxWaitMs) {
        const pgCount = await executeQuery<{ count: number }>(
          `SELECT COUNT(*) as count FROM PG_TOKENS_STAGING WHERE FILE_ID = @fileId`,
          { fileId }
        );

        if ((pgCount.recordset[0]?.count ?? 0) >= uniqueTokens.length) {
          logger.info('PG tokens ready in staging', { count: pgCount.recordset[0]?.count });
          break;
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        waited += pollIntervalMs;
        logger.info('Still waiting for PG tokens...', { waited, expected: uniqueTokens.length });
      }

      if (waited >= maxWaitMs) {
        logger.warn('Timeout waiting for PG tokens - proceeding anyway');
      }
    }

    // Get total batches from batch record
    const batchResult = await executeQuery<{ TOTAL_BATCHES: number }>(
      `SELECT TOTAL_BATCHES FROM TOKEN_MIGRATION_BATCH
       WHERE FILE_ID = @fileId AND BATCH_ID = @fileId`,
      { fileId }
    );

    const totalBatches = batchResult.recordset[0]?.TOTAL_BATCHES ?? 1;

    // Queue batch manager message
    const batchManagerMessage: BatchManagerMessage = {
      fileId,
      sourceId,
      totalBatches,
    };
    await queueBatchManager(batchManagerMessage);

    logger.info('File generation completed, queued for batch management');

  } catch (error) {
    logger.error('Failed to generate file', error);

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
 * Remove duplicate tokens
 */
function removeDuplicates(tokens: TokenForMc[]): TokenForMc[] {
  const seen = new Set<string>();
  const unique: TokenForMc[] = [];

  for (const token of tokens) {
    if (!seen.has(token.MONERIS_TOKEN)) {
      seen.add(token.MONERIS_TOKEN);
      unique.push(token);
    }
  }

  return unique;
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
app.storageQueue('fileGen', {
  queueName: 'file-gen-queue',
  connection: 'AzureWebJobsStorage',
  handler: fileGenHandler,
});

export { fileGenHandler };
