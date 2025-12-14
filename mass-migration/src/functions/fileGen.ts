import { app, InvocationContext } from '@azure/functions';
import { getConfig } from '../config/index.js';
import { createLogger, Logger } from '../utils/logger.js';
import { executeQuery } from '../services/database.js';
import { uploadBlob } from '../services/blobStorage.js';
import {
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
    // The MC response blob trigger (uploadFileMastercard) will queue batchManager
    // after PG tokens are loaded - this is the correct production flow
    if (config.MOCK_MASTERCARD_ENABLED) {
      logger.info('Mock mode enabled, generating mock MC response');
      await triggerMockMastercardResponse(fileId, uniqueTokens, sourceId, config);
      logger.info('Mock MC response generated, waiting for blob trigger to process and queue batch manager');
    }

    // In production mode, fileGen completes here.
    // The MC response will arrive later (hours/days) via external EFT process.
    // uploadFileMastercard will queue batchManager when MC response is processed.
    logger.info('File generation completed', {
      mcFileName,
      tokenCount: uniqueTokens.length,
      mockMode: config.MOCK_MASTERCARD_ENABLED
    });

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
