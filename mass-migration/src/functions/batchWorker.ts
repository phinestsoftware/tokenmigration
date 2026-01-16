// Initialize Dynatrace tracing before other imports
import '../index.js';

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
  LAST_USE_DATE: Date | null;
}

interface PgTokenForMigration {
  MONERIS_TOKEN: string;
  PG_TOKEN: string;
  FIRST_SIX: string | null;
  LAST_FOUR: string | null;
  FUNDING_METHOD: string | null;
  CC_CARD_BRAND: string | null;
  CC_EXP_DATE: string | null;
  PAYMENT_METHOD_TYPE: string | null;
  SOURCEOFFUNDS_NUMBER: string | null;
  MONERIS2PG_MIGRATION_STATUS: string;
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
    `SELECT ID, MONERIS_TOKEN, EXP_DATE, ENTITY_ID, ENTITY_TYPE, LAST_USE_DATE
     FROM MONERIS_TOKENS_STAGING
     WHERE BATCH_ID = @batchId`,
    { batchId }
  );

  const monerisTokens = monerisResult.recordset;

  logger.info('Processing batch tokens', { tokenCount: monerisTokens.length });

  // Get corresponding PG tokens from MC response
  // Per DDD: correlationId in MC response = MONERIS_TOKEN, so join ONLY on MONERIS_TOKEN
  // FILE_ID is not used for join because MC response file can have any name
  const pgResult = await executeQuery<PgTokenForMigration>(
    `SELECT MONERIS_TOKEN, PG_TOKEN, FIRST_SIX, LAST_FOUR, FUNDING_METHOD,
            CC_CARD_BRAND, CC_EXP_DATE, PAYMENT_METHOD_TYPE, SOURCEOFFUNDS_NUMBER,
            MONERIS2PG_MIGRATION_STATUS
     FROM PG_TOKENS_STAGING
     WHERE MONERIS_TOKEN IN (SELECT MONERIS_TOKEN FROM MONERIS_TOKENS_STAGING WHERE BATCH_ID = @batchId)`,
    { batchId }
  );

  // Create lookup map for PG tokens
  const pgTokenMap = new Map<string, PgTokenForMigration>();
  for (const pg of pgResult.recordset) {
    pgTokenMap.set(pg.MONERIS_TOKEN, pg);
  }

  logger.info('PG tokens found', { pgTokenCount: pgTokenMap.size });

  // Collect updates for bulk operations
  const successUpdates: {
    ID: number;
    MIGRATION_STATUS: string;
    PMR: string;
    CC_TOKEN: string;
    CC_EXP_DATE: string | null;
    CC_CARD_BRAND: string | null;
    FIRST_SIX: string | null;
    LAST_FOUR: string | null;
    PM_TYPE_ID: string | null;
    PM_STATUS: string;
    PM_IS_PREF: string;
    ISSUER_NAME: string | null;
    CARD_LEVEL: string | null;
  }[] = [];
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

  // Collect Payment Hub records for bulk insert
  const paymentHubRecords: PaymentHubRecords = {
    paymentMethods: [],
    tokenizedCards: [],
    entityDetails: [],
    entityPmrMappings: [],
    pmrMonerisMappings: [],
  };

  const now = new Date();

  // Process each token - collect updates but don't execute individually
  for (const moneris of monerisTokens) {
    const pgToken = pgTokenMap.get(moneris.MONERIS_TOKEN);

    if (pgToken && pgToken.MONERIS2PG_MIGRATION_STATUS === 'SUCCESS' && pgToken.PG_TOKEN) {
      // Generate PMR from PG token (9→8 first digit swap)
      const pmr = generatePMR(pgToken.PG_TOKEN);

      // Decode Payment Method Type to PM_TYPE_ID
      const pmTypeId = decodePaymentMethodType(pgToken.PAYMENT_METHOD_TYPE);
      const pmTypeIdNum = pmTypeId ? parseInt(pmTypeId, 10) : 1;

      // Extract FIRST_SIX and LAST_FOUR from SOURCEOFFUNDS_NUMBER if not already present
      let firstSix = pgToken.FIRST_SIX;
      let lastFour = pgToken.LAST_FOUR;
      if ((!firstSix || !lastFour) && pgToken.SOURCEOFFUNDS_NUMBER) {
        const extracted = extractCardDigits(pgToken.SOURCEOFFUNDS_NUMBER);
        firstSix = firstSix || extracted.firstSix;
        lastFour = lastFour || extracted.lastFour;
      }

      // Collect success update with transformed fields
      successUpdates.push({
        ID: moneris.ID,
        MIGRATION_STATUS: 'COMPLETED',
        PMR: pmr,
        CC_TOKEN: pgToken.PG_TOKEN,
        CC_EXP_DATE: pgToken.CC_EXP_DATE,
        CC_CARD_BRAND: pgToken.CC_CARD_BRAND,
        FIRST_SIX: firstSix,
        LAST_FOUR: lastFour,
        PM_TYPE_ID: pmTypeId,
        PM_STATUS: 'A', // Active status
        PM_IS_PREF: 'N', // Not preferred by default
        ISSUER_NAME: null,
        CARD_LEVEL: null,
      });

      // Collect Payment Hub records
      // 1. PAYMENT_METHOD
      paymentHubRecords.paymentMethods.push({
        PMR: pmr,
        PM_TYPE_ID: pmTypeIdNum,
        PM_STATUS: 'A',
        PAR: null,
        PM_CREATION_DATE: now,
        PM_LAST_UPDATED: now,
        PM_LAST_USE_DATE: moneris.LAST_USE_DATE,
        PM_CREATION_CHANNEL: 'MIGRATION',
        PM_UPDATED_CHANNEL: 'MIGRATION',
        INITIAL_TXN_ID: null,
      });

      // 5. PMR_MONERIS_MAPPING
      paymentHubRecords.pmrMonerisMappings.push({
        PMR: pmr,
        MONERIS_TOKEN: moneris.MONERIS_TOKEN,
        PG_TOKEN: pgToken.PG_TOKEN,
        CREATION_DATE: now,
      });

      // 2. TOKENIZED_CARD
      paymentHubRecords.tokenizedCards.push({
        CC_TOKEN: pgToken.PG_TOKEN,
        PMR: pmr,
        CC_EXP_DATE: pgToken.CC_EXP_DATE,
        CC_CARD_BRAND: pgToken.CC_CARD_BRAND,
        FIRST_SIX: firstSix,
        LAST_FOUR: lastFour,
        ISSUER_NAME: null,
        CARD_LEVEL: null,
      });

      // 3. ENTITY_DETAILS (if entity info available)
      if (moneris.ENTITY_ID) {
        const entityRefId = decodeEntityRefId(moneris.ENTITY_TYPE);
        paymentHubRecords.entityDetails.push({
          ENTITY_ID: moneris.ENTITY_ID,
          ENTITY_REF_ID: entityRefId || 1,
          ENTITY_VALUE: moneris.ENTITY_ID,
          APPLICATION_INDICATOR: 'BILLING',
          SYSTEM_INDICATOR: 'MONERIS',
          ENTITY_CREATION_DATE: now,
          ENTITY_LAST_UPDATED: now,
          PM_USAGE_TYPE: null,
        });

        // 4. ENTITY_PMR_MAPPING
        paymentHubRecords.entityPmrMappings.push({
          ENTITY_ID: moneris.ENTITY_ID,
          PMR: pmr,
          PM_USAGE_TYPE: null,
          PM_IS_PREF: 'N',
          ENTITY_STATUS: 'A',
          ENTITY_CREATION_DATE: now,
          ENTITY_LAST_UPDATED: now,
        });
      }

    } else {
      // Collect failure update
      const errorMessage = pgToken
        ? `MC response: ${pgToken.MONERIS2PG_MIGRATION_STATUS}`
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

  // Execute bulk updates for MONERIS_TOKENS_STAGING
  if (successUpdates.length > 0) {
    logger.info('Bulk updating successful tokens', { count: successUpdates.length });
    await bulkUpdate(
      'MONERIS_TOKENS_STAGING',
      'ID',
      successUpdates,
      ['MIGRATION_STATUS', 'PMR', 'CC_TOKEN', 'CC_EXP_DATE', 'CC_CARD_BRAND',
        'FIRST_SIX', 'LAST_FOUR', 'PM_TYPE_ID', 'PM_STATUS', 'PM_IS_PREF',
        'ISSUER_NAME', 'CARD_LEVEL']
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

  // Populate Payment Hub tables
  if (successUpdates.length > 0) {
    logger.info('Populating Payment Hub tables');
    await populatePaymentHub(paymentHubRecords, logger);
  }

  logger.info('Batch processing completed', {
    successCount: successUpdates.length,
    failureCount: failureUpdates.length,
    paymentMethodsCreated: paymentHubRecords.paymentMethods.length,
    tokenizedCardsCreated: paymentHubRecords.tokenizedCards.length,
  });
}

/**
 * Generate PMR (Payment Method Reference) from PG Token
 * PMR is derived by replacing the first digit from 9 to 8
 * Example: 9703796509383554 → 8703796509383554
 */
function generatePMR(pgToken: string): string {
  if (!pgToken || pgToken.length === 0) {
    throw new Error('Cannot generate PMR: PG Token is empty');
  }

  // Replace first digit from 9 to 8
  if (pgToken.charAt(0) === '9') {
    return '8' + pgToken.substring(1);
  }

  // If token doesn't start with 9, still replace first digit with 8
  // This ensures PMR always starts with 8
  return '8' + pgToken.substring(1);
}

/**
 * Decode Payment Method Type to PM_TYPE_ID
 * Maps CREDIT/DEBIT/PREPAID/OTHER to type IDs
 */
function decodePaymentMethodType(paymentMethodType: string | null): string | null {
  if (!paymentMethodType) return null;

  const typeMap: Record<string, string> = {
    'CREDIT': '1',
    'DEBIT': '2',
    'PREPAID': '3',
    'OTHER': '4',
  };

  return typeMap[paymentMethodType.toUpperCase()] || null;
}

/**
 * Extract FIRST_SIX and LAST_FOUR from SOURCEOFFUNDS_NUMBER
 * Format: 512345xxxxxx2346 → FIRST_SIX: 512345, LAST_FOUR: 2346
 */
function extractCardDigits(sourceOfFundsNumber: string | null): { firstSix: string | null; lastFour: string | null } {
  if (!sourceOfFundsNumber || sourceOfFundsNumber.length < 16) {
    return { firstSix: null, lastFour: null };
  }

  // Extract first 6 digits
  const firstSix = sourceOfFundsNumber.substring(0, 6);
  // Extract last 4 digits
  const lastFour = sourceOfFundsNumber.substring(sourceOfFundsNumber.length - 4);

  return { firstSix, lastFour };
}

/**
 * Decode ENTITY_TYPE to ENTITY_REF_ID
 * 1=ACCOUNTNUM, 2=GUID, 3=EMAILID, 4=VOICEID
 */
function decodeEntityRefId(entityType: string | null): number | null {
  if (!entityType) return 1; // Default to ACCOUNTNUM

  const entityTypeMap: Record<string, number> = {
    'ACCOUNTNUM': 1,
    'GUID': 2,
    'EMAILID': 3,
    'VOICEID': 4,
  };

  return entityTypeMap[entityType.toUpperCase()] || 1;
}

interface PaymentHubRecords {
  paymentMethods: {
    PMR: string;
    PM_TYPE_ID: number;
    PM_STATUS: string;
    PAR: string | null;
    PM_CREATION_DATE: Date;
    PM_LAST_UPDATED: Date;
    PM_LAST_USE_DATE: Date | null;
    PM_CREATION_CHANNEL: string;
    PM_UPDATED_CHANNEL: string;
    INITIAL_TXN_ID: string | null;
  }[];
  tokenizedCards: {
    CC_TOKEN: string;
    PMR: string;
    CC_EXP_DATE: string | null;
    CC_CARD_BRAND: string | null;
    FIRST_SIX: string | null;
    LAST_FOUR: string | null;
    ISSUER_NAME: string | null;
    CARD_LEVEL: string | null;
  }[];
  entityDetails: {
    ENTITY_ID: string;
    ENTITY_REF_ID: number;
    ENTITY_VALUE: string | null;
    APPLICATION_INDICATOR: string;
    SYSTEM_INDICATOR: string;
    ENTITY_CREATION_DATE: Date;
    ENTITY_LAST_UPDATED: Date;
    PM_USAGE_TYPE: string | null;
  }[];
  entityPmrMappings: {
    ENTITY_ID: string;
    PMR: string;
    PM_USAGE_TYPE: string | null;
    PM_IS_PREF: string;
    ENTITY_STATUS: string;
    ENTITY_CREATION_DATE: Date;
    ENTITY_LAST_UPDATED: Date;
  }[];
  pmrMonerisMappings: {
    PMR: string;
    MONERIS_TOKEN: string;
    PG_TOKEN: string;
    CREATION_DATE: Date;
  }[];
}

/**
 * Populate Payment Hub tables with migrated token data
 * Tables: PAYMENT_METHOD, TOKENIZED_CARD, ENTITY_DETAILS, ENTITY_PMR_MAPPING
 */
async function populatePaymentHub(
  records: PaymentHubRecords,
  logger: Logger
): Promise<void> {
  // 1. Insert PAYMENT_METHOD records
  if (records.paymentMethods.length > 0) {
    const pmColumns = [
      'PMR', 'PM_TYPE_ID', 'PM_STATUS', 'PAR', 'PM_CREATION_DATE',
      'PM_LAST_UPDATED', 'PM_LAST_USE_DATE', 'PM_CREATION_CHANNEL', 'PM_UPDATED_CHANNEL', 'INITIAL_TXN_ID'
    ];
    logger.info('Inserting PAYMENT_METHOD records', { count: records.paymentMethods.length });
    await bulkInsertValues('PAYMENT_METHOD', pmColumns, records.paymentMethods);
  }

  // 2. Insert TOKENIZED_CARD records
  if (records.tokenizedCards.length > 0) {
    const tcColumns = [
      'CC_TOKEN', 'PMR', 'CC_EXP_DATE', 'CC_CARD_BRAND',
      'FIRST_SIX', 'LAST_FOUR', 'ISSUER_NAME', 'CARD_LEVEL'
    ];
    logger.info('Inserting TOKENIZED_CARD records', { count: records.tokenizedCards.length });
    await bulkInsertValues('TOKENIZED_CARD', tcColumns, records.tokenizedCards);
  }

  // 3. Insert ENTITY_DETAILS records (check for duplicates first)
  if (records.entityDetails.length > 0) {
    // Get unique entity IDs
    const uniqueEntities = new Map<string, typeof records.entityDetails[0]>();
    for (const entity of records.entityDetails) {
      if (!uniqueEntities.has(entity.ENTITY_ID)) {
        uniqueEntities.set(entity.ENTITY_ID, entity);
      }
    }

    const edColumns = [
      'ENTITY_ID', 'ENTITY_REF_ID', 'ENTITY_VALUE', 'APPLICATION_INDICATOR',
      'SYSTEM_INDICATOR', 'ENTITY_CREATION_DATE', 'ENTITY_LAST_UPDATED', 'PM_USAGE_TYPE'
    ];
    logger.info('Inserting ENTITY_DETAILS records', { count: uniqueEntities.size });

    // Insert only if entity doesn't exist
    for (const entity of uniqueEntities.values()) {
      await executeQuery(
        `IF NOT EXISTS (SELECT 1 FROM ENTITY_DETAILS WHERE ENTITY_ID = @entityId)
         INSERT INTO ENTITY_DETAILS (ENTITY_ID, ENTITY_REF_ID, ENTITY_VALUE, APPLICATION_INDICATOR,
           SYSTEM_INDICATOR, ENTITY_CREATION_DATE, ENTITY_LAST_UPDATED, PM_USAGE_TYPE)
         VALUES (@entityId, @entityRefId, @entityValue, @appIndicator,
           @sysIndicator, @creationDate, @lastUpdated, @usageType)`,
        {
          entityId: entity.ENTITY_ID,
          entityRefId: entity.ENTITY_REF_ID,
          entityValue: entity.ENTITY_VALUE,
          appIndicator: entity.APPLICATION_INDICATOR,
          sysIndicator: entity.SYSTEM_INDICATOR,
          creationDate: entity.ENTITY_CREATION_DATE,
          lastUpdated: entity.ENTITY_LAST_UPDATED,
          usageType: entity.PM_USAGE_TYPE,
        }
      );
    }
  }

  // 4. Insert ENTITY_PMR_MAPPING records
  if (records.entityPmrMappings.length > 0) {
    const epmColumns = [
      'ENTITY_ID', 'PMR', 'PM_USAGE_TYPE', 'PM_IS_PREF',
      'ENTITY_STATUS', 'ENTITY_CREATION_DATE', 'ENTITY_LAST_UPDATED'
    ];
    logger.info('Inserting ENTITY_PMR_MAPPING records', { count: records.entityPmrMappings.length });
    await bulkInsertValues('ENTITY_PMR_MAPPING', epmColumns, records.entityPmrMappings);
  }

  // 5. Insert PMR_MONERIS_MAPPING records
  if (records.pmrMonerisMappings.length > 0) {
    const pmmColumns = ['PMR', 'MONERIS_TOKEN', 'PG_TOKEN', 'CREATION_DATE'];
    logger.info('Inserting PMR_MONERIS_MAPPING records', { count: records.pmrMonerisMappings.length });
    await bulkInsertValues('PMR_MONERIS_MAPPING', pmmColumns, records.pmrMonerisMappings);
  }
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
