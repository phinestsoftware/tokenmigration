// Initialize Dynatrace tracing before other imports
import '../index.js';

import { app, InvocationContext, HttpRequest, HttpResponseInit } from '@azure/functions';
import { createLogger, Logger } from '../utils/logger.js';
import { getConfig } from '../config/index.js';
import { executeQuery } from '../services/database.js';
import { uploadBlob } from '../services/blobStorage.js';
import { decodeQueueMessage, BillingFileMessage } from '../services/queueService.js';
import { generateCsv, generateTrailer } from '../utils/fileParser.js';
import { BillingOutputCsvColumns, BillingOutputRecord } from '../models/pgToken.js';
import { AuditMessageCodes, parseFileName, generateOutputFileName } from '../models/migrationBatch.js';

interface MigrationResult {
  MONERIS_TOKEN: string;
  EXP_DATE: string | null;
  ENTITY_ID: string | null;
  ENTITY_TYPE: string | null;
  PMR: string | null;
  PG_TOKEN: string | null;
  CC_CARD_BRAND: string | null;
  FIRST_SIX: string | null;
  LAST_FOUR: string | null;
  FUNDING_METHOD: string | null;
  MIGRATION_STATUS: string;
  ERROR_CODE: string | null;
}

/**
 * Generate Billing File Function
 * Queue + HTTP triggered - generates success/failure files for billing systems
 */
async function generateBillingFileHandler(
  input: unknown,
  context: InvocationContext
): Promise<void> {
  // Parse input (could be from queue or HTTP)
  const message = typeof input === 'string'
    ? decodeQueueMessage<BillingFileMessage>(input)
    : input as BillingFileMessage;

  const { sourceId, fileId, startDate, endDate } = message;

  const logger: Logger = createLogger('generateBillingFile', context, { fileId: fileId ?? 'all' });

  logger.info('Starting billing file generation', { sourceId, fileId, startDate, endDate });

  try {
    const config = getConfig();

    // Get migration results
    const results = await getMigrationResults(sourceId, fileId, startDate, endDate);

    if (results.length === 0) {
      logger.info('No results to generate files for');
      return;
    }

    // Split into success and failure
    const successRecords: BillingOutputRecord[] = [];
    const failureRecords: Array<{ monerisToken: string; expDate: string | null; entityId: string | null; entityRefType: string | null; errorCode: string | null; errorDescription: string | null }> = [];

    for (const result of results) {
      if (result.MIGRATION_STATUS === 'COMPLETED' && result.PMR) {
        successRecords.push({
          monerisToken: result.MONERIS_TOKEN,
          expDate: result.EXP_DATE,
          entityId: result.ENTITY_ID,
          entityRefType: result.ENTITY_TYPE,
          pmr: result.PMR,
          cardBrand: result.CC_CARD_BRAND,
          firstSix: result.FIRST_SIX,
          lastFour: result.LAST_FOUR,
          fundingMethod: result.FUNDING_METHOD,
        });
      } else {
        failureRecords.push({
          monerisToken: result.MONERIS_TOKEN,
          expDate: result.EXP_DATE,
          entityId: result.ENTITY_ID,
          entityRefType: result.ENTITY_TYPE,
          errorCode: result.ERROR_CODE,
          errorDescription: await getErrorDescription(result.ERROR_CODE),
        });
      }
    }

    logger.info('Results categorized', {
      total: results.length,
      success: successRecords.length,
      failure: failureRecords.length,
    });

    // Generate file names
    const parsedFile = fileId ? parseFileName(fileId) : null;
    const dateStr = parsedFile?.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = parsedFile?.sequence ?? '0001';

    // Map source folder
    const sourceFolder = mapSourceFolder(sourceId);

    // Generate and upload success file
    if (successRecords.length > 0) {
      const successFileName = generateOutputFileName(sourceId, 'P', dateStr, seq, 'output');
      const successContent = generateBillingSuccessFile(successRecords);

      await uploadBlob(
        config.BILLING_OUTPUT_CONTAINER,
        `${sourceFolder}/success/${successFileName}`,
        successContent
      );

      logger.info('Success file uploaded', {
        fileName: successFileName,
        recordCount: successRecords.length,
      });

      // Insert audit log
      await insertAuditLog(fileId ?? null, null, AuditMessageCodes.OUTPUT_GENERATED,
        `Success file generated: ${successFileName}`,
        { fileName: successFileName, recordCount: successRecords.length });
    }

    // Generate and upload failure file
    if (failureRecords.length > 0) {
      const failureFileName = generateOutputFileName(sourceId, 'P', dateStr, seq, 'failure');
      const failureContent = generateBillingFailureFile(failureRecords);

      await uploadBlob(
        config.BILLING_OUTPUT_CONTAINER,
        `${sourceFolder}/failure/${failureFileName}`,
        failureContent
      );

      logger.info('Failure file uploaded', {
        fileName: failureFileName,
        recordCount: failureRecords.length,
      });

      // Insert audit log
      await insertAuditLog(fileId ?? null, null, AuditMessageCodes.OUTPUT_GENERATED,
        `Failure file generated: ${failureFileName}`,
        { fileName: failureFileName, recordCount: failureRecords.length });
    }

    // Update extraction status in staging table
    if (fileId) {
      await executeQuery(
        `UPDATE MONERIS_TOKENS_STAGING
         SET UPDATED_AT = GETUTCDATE(), UPDATED_BY = 'BILLING_GEN'
         WHERE FILE_ID = @fileId AND MIGRATION_STATUS IN ('COMPLETED', 'FAILED')`,
        { fileId }
      );
    }

    logger.info('Billing file generation completed');

  } catch (error) {
    logger.error('Failed to generate billing files', error);
    throw error;
  }
}

/**
 * HTTP handler for manual file generation
 */
async function generateBillingFileHttpHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger: Logger = createLogger('generateBillingFile-http', context);

  try {
    const sourceId = request.query.get('sourceId');
    const fileId = request.query.get('fileId');
    const startDate = request.query.get('startDate');
    const endDate = request.query.get('endDate');

    if (!sourceId) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'sourceId is required' }),
      };
    }

    const message: BillingFileMessage = {
      sourceId,
      fileId: fileId ?? undefined,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
    };

    await generateBillingFileHandler(message, context);

    return {
      status: 200,
      body: JSON.stringify({ message: 'Billing files generated successfully' }),
    };

  } catch (error) {
    logger.error('HTTP handler failed', error);
    return {
      status: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
}

/**
 * Get migration results for file generation
 */
async function getMigrationResults(
  sourceId: string,
  fileId?: string,
  startDate?: string,
  endDate?: string
): Promise<MigrationResult[]> {
  let query = `
    SELECT
      m.MONERIS_TOKEN,
      m.EXP_DATE,
      m.ENTITY_ID,
      m.ENTITY_TYPE,
      m.PMR,
      p.PG_TOKEN,
      p.CC_CARD_BRAND,
      p.FIRST_SIX,
      p.LAST_FOUR,
      p.FUNDING_METHOD,
      m.MIGRATION_STATUS,
      m.ERROR_CODE
    FROM MONERIS_TOKENS_STAGING m
    LEFT JOIN PG_TOKENS_STAGING p ON m.MONERIS_TOKEN = p.MONERIS_TOKEN AND m.FILE_ID = p.FILE_ID
    JOIN TOKEN_MIGRATION_BATCH b ON m.FILE_ID = b.FILE_ID AND b.BATCH_ID = b.FILE_ID
    WHERE b.SOURCE_ID = @sourceId
      AND m.MIGRATION_STATUS IN ('COMPLETED', 'FAILED')
  `;

  const params: Record<string, unknown> = { sourceId };

  if (fileId) {
    query += ` AND m.FILE_ID = @fileId`;
    params.fileId = fileId;
  }

  if (startDate) {
    query += ` AND m.CREATED_AT >= @startDate`;
    params.startDate = startDate;
  }

  if (endDate) {
    query += ` AND m.CREATED_AT <= @endDate`;
    params.endDate = endDate;
  }

  const result = await executeQuery<MigrationResult>(query, params);
  return result.recordset;
}

/**
 * Generate success file content
 */
function generateBillingSuccessFile(records: BillingOutputRecord[]): string {
  const rows = records.map((r) => ({
    MONERIS_TOKEN: r.monerisToken,
    EXP_DATE: r.expDate ?? '',
    ENTITY_ID: r.entityId ?? '',
    ENTITY_REF_TYPE: r.entityRefType ?? '',
    PMR: r.pmr,
    CARD_BRAND: r.cardBrand ?? '',
    FIRST_SIX: r.firstSix ?? '',
    LAST_FOUR: r.lastFour ?? '',
    FUNDING_METHOD: r.fundingMethod ?? '',
  }));

  const trailer = generateTrailer(records.length);

  return generateCsv(rows, [...BillingOutputCsvColumns], { trailer });
}

/**
 * Generate failure file content
 */
function generateBillingFailureFile(
  records: Array<{
    monerisToken: string;
    expDate: string | null;
    entityId: string | null;
    entityRefType: string | null;
    errorCode: string | null;
    errorDescription: string | null;
  }>
): string {
  const columns = ['MONERIS_TOKEN', 'EXP_DATE', 'ENTITY_ID', 'ENTITY_REF_TYPE', 'ERROR_CODE', 'ERROR_DESCRIPTION'];

  const rows = records.map((r) => ({
    MONERIS_TOKEN: r.monerisToken,
    EXP_DATE: r.expDate ?? '',
    ENTITY_ID: r.entityId ?? '',
    ENTITY_REF_TYPE: r.entityRefType ?? '',
    ERROR_CODE: r.errorCode ?? '',
    ERROR_DESCRIPTION: r.errorDescription ?? '',
  }));

  const trailer = generateTrailer(records.length);

  return generateCsv(rows, columns, { trailer });
}

/**
 * Map source ID to folder name
 */
function mapSourceFolder(sourceId: string): string {
  const mapping: Record<string, string> = {
    V21: 'v21',
    WINM: 'winmedia',
    TSC: 'tsc',
  };
  return mapping[sourceId.toUpperCase()] ?? sourceId.toLowerCase();
}

/**
 * Get error description from code
 */
async function getErrorDescription(errorCode: string | null): Promise<string | null> {
  if (!errorCode) return null;

  const descriptions: Record<string, string> = {
    E001: 'Invalid token format',
    E002: 'Invalid token length',
    E003: 'Invalid token prefix',
    E004: 'Missing mandatory field',
    E005: 'Invalid expiry date',
    E006: 'Token expired',
    E007: 'Duplicate token in file',
    E008: 'Token already exists in Payment Hub',
    E009: 'Invalid entity type',
    E010: 'Invalid entity status',
    NO_PG_TOKEN: 'No Mastercard token received',
  };

  return descriptions[errorCode] ?? `Error: ${errorCode}`;
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

// Register queue trigger
app.storageQueue('generateBillingFile', {
  queueName: 'billing-file-queue',
  connection: 'AzureWebJobsStorage',
  handler: generateBillingFileHandler,
});

// Register HTTP trigger for manual invocation
app.http('generateBillingFileHttp', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  route: 'billing/generate',
  handler: generateBillingFileHttpHandler,
});

export { generateBillingFileHandler, generateBillingFileHttpHandler };
