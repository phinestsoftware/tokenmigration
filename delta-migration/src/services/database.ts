import sql from 'mssql';
import { getDatabaseConfig } from '../config';
import { MonerisToken } from '../models/monerisToken';
import { PgToken, PgTokenizationResult } from '../models/pgToken';
import { MigrationBatch, FileMetadata } from '../models/migrationBatch';

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = await sql.connect(config);
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

// File Metadata Operations
export async function insertFileMetadata(metadata: FileMetadata): Promise<void> {
  const db = await getPool();
  await db.request()
    .input('fileId', sql.NVarChar(100), metadata.fileId)
    .input('fileName', sql.NVarChar(255), metadata.fileName)
    .input('sourceId', sql.NVarChar(50), metadata.sourceId)
    .input('fileType', sql.NVarChar(10), metadata.fileType)
    .input('status', sql.NVarChar(20), metadata.status)
    .input('totalRecords', sql.Int, metadata.totalRecords)
    .input('uploadedAt', sql.DateTime2, metadata.uploadedAt)
    .query(`
      INSERT INTO TOKEN_MIGRATION_BATCH
      (FILE_ID, FILE_NAME, SOURCE_ID, FILE_TYPE, STATUS, TOTAL_RECORDS, UPLOADED_AT)
      VALUES (@fileId, @fileName, @sourceId, @fileType, @status, @totalRecords, @uploadedAt)
    `);
}

export async function updateFileStatus(fileId: string, status: string, validRecords?: number, invalidRecords?: number): Promise<void> {
  const db = await getPool();
  await db.request()
    .input('fileId', sql.NVarChar(100), fileId)
    .input('status', sql.NVarChar(20), status)
    .input('validRecords', sql.Int, validRecords ?? 0)
    .input('invalidRecords', sql.Int, invalidRecords ?? 0)
    .query(`
      UPDATE TOKEN_MIGRATION_BATCH
      SET STATUS = @status,
          VALID_RECORDS = @validRecords,
          INVALID_RECORDS = @invalidRecords,
          UPDATED_AT = GETUTCDATE()
      WHERE FILE_ID = @fileId
    `);
}

// Moneris Token Operations
export async function insertMonerisTokens(tokens: MonerisToken[]): Promise<void> {
  const db = await getPool();

  for (const token of tokens) {
    await db.request()
      .input('fileId', sql.NVarChar(100), token.fileId)
      .input('monerisToken', sql.NVarChar(50), token.monerisToken)
      .input('expDate', sql.NVarChar(10), token.expDate)
      .input('entityId', sql.NVarChar(100), token.entityId)
      .input('entityType', sql.NVarChar(10), token.entityType)
      .input('entityStatus', sql.NVarChar(10), token.entityStatus)
      .input('creationDate', sql.NVarChar(20), token.creationDate)
      .input('lastUseDate', sql.NVarChar(20), token.lastUseDate)
      .input('trxSeqNo', sql.NVarChar(50), token.trxSeqNo)
      .input('businessUnit', sql.NVarChar(50), token.businessUnit)
      .input('validationStatus', sql.NVarChar(20), token.validationStatus)
      .input('migrationStatus', sql.NVarChar(20), token.migrationStatus)
      .query(`
        INSERT INTO MONERIS_TOKENS_STAGING
        (FILE_ID, MONERIS_TOKEN, EXP_DATE, ENTITY_ID, ENTITY_TYPE, ENTITY_STATUS,
         CREATION_DATE, LAST_USE_DATE, TRX_SEQ_NO, BUSINESS_UNIT,
         VALIDATION_STATUS, MIGRATION_STATUS, CREATED_AT)
        VALUES (@fileId, @monerisToken, @expDate, @entityId, @entityType, @entityStatus,
                @creationDate, @lastUseDate, @trxSeqNo, @businessUnit,
                @validationStatus, @migrationStatus, GETUTCDATE())
      `);
  }
}

export async function getTokensForBatch(fileId: string, batchSize: number): Promise<MonerisToken[]> {
  const db = await getPool();
  const result = await db.request()
    .input('fileId', sql.NVarChar(100), fileId)
    .input('batchSize', sql.Int, batchSize)
    .query(`
      SELECT TOP (@batchSize)
        ID as id, FILE_ID as fileId, MONERIS_TOKEN as monerisToken, EXP_DATE as expDate,
        ENTITY_ID as entityId, ENTITY_TYPE as entityType, ENTITY_STATUS as entityStatus,
        CREATION_DATE as creationDate, LAST_USE_DATE as lastUseDate,
        VALIDATION_STATUS as validationStatus, MIGRATION_STATUS as migrationStatus,
        BATCH_ID as batchId
      FROM MONERIS_TOKENS_STAGING
      WHERE FILE_ID = @fileId
        AND VALIDATION_STATUS = 'VALID'
        AND MIGRATION_STATUS = 'PENDING'
      ORDER BY ID
    `);
  return result.recordset;
}

export async function updateTokenMigrationStatus(tokenIds: number[], status: string, batchId: string): Promise<void> {
  const db = await getPool();
  const idList = tokenIds.join(',');
  await db.request()
    .input('status', sql.NVarChar(20), status)
    .input('batchId', sql.NVarChar(100), batchId)
    .query(`
      UPDATE MONERIS_TOKENS_STAGING
      SET MIGRATION_STATUS = @status, BATCH_ID = @batchId, UPDATED_AT = GETUTCDATE()
      WHERE ID IN (${idList})
    `);
}

// PG Token Operations
export async function insertPgTokenResults(fileId: string, results: PgTokenizationResult[]): Promise<void> {
  const db = await getPool();

  for (const result of results) {
    await db.request()
      .input('fileId', sql.NVarChar(100), fileId)
      .input('monerisToken', sql.NVarChar(50), result.monerisToken)
      .input('pgToken', sql.NVarChar(50), result.pgToken || '')
      .input('correlationId', sql.NVarChar(100), result.correlationId)
      .input('maskedPan', sql.NVarChar(20), result.maskedPan)
      .input('cardBrand', sql.NVarChar(20), result.cardBrand)
      .input('fundingMethod', sql.NVarChar(20), result.fundingMethod)
      .input('firstSix', sql.NVarChar(10), result.firstSix)
      .input('lastFour', sql.NVarChar(10), result.lastFour)
      .input('expiryMonth', sql.NVarChar(5), result.expiryMonth)
      .input('expiryYear', sql.NVarChar(5), result.expiryYear)
      .input('status', sql.NVarChar(20), result.result)
      .input('errorCode', sql.NVarChar(50), result.errorCode)
      .input('errorMessage', sql.NVarChar(500), result.errorMessage)
      .input('failedStep', sql.NVarChar(50), result.failedStep)
      .query(`
        INSERT INTO PG_TOKENS_STAGING
        (FILE_ID, MONERIS_TOKEN, PG_TOKEN, CORRELATION_ID, MASKED_PAN, CARD_BRAND,
         FUNDING_METHOD, FIRST_SIX, LAST_FOUR, EXPIRY_MONTH, EXPIRY_YEAR,
         STATUS, ERROR_CODE, ERROR_MESSAGE, FAILED_STEP, CREATED_AT)
        VALUES (@fileId, @monerisToken, @pgToken, @correlationId, @maskedPan, @cardBrand,
                @fundingMethod, @firstSix, @lastFour, @expiryMonth, @expiryYear,
                @status, @errorCode, @errorMessage, @failedStep, GETUTCDATE())
      `);
  }
}

// Batch Operations
export async function insertBatch(batch: MigrationBatch): Promise<void> {
  const db = await getPool();
  await db.request()
    .input('batchId', sql.NVarChar(100), batch.batchId)
    .input('fileId', sql.NVarChar(100), batch.fileId)
    .input('sourceId', sql.NVarChar(50), batch.sourceId)
    .input('status', sql.NVarChar(20), batch.status)
    .input('totalTokens', sql.Int, batch.totalTokens)
    .query(`
      INSERT INTO DELTA_MIGRATION_BATCH
      (BATCH_ID, FILE_ID, SOURCE_ID, STATUS, TOTAL_TOKENS, CREATED_AT)
      VALUES (@batchId, @fileId, @sourceId, @status, @totalTokens, GETUTCDATE())
    `);
}

export async function updateBatchStatus(
  batchId: string,
  status: string,
  processed: number,
  success: number,
  errors: number
): Promise<void> {
  const db = await getPool();
  await db.request()
    .input('batchId', sql.NVarChar(100), batchId)
    .input('status', sql.NVarChar(20), status)
    .input('processed', sql.Int, processed)
    .input('success', sql.Int, success)
    .input('errors', sql.Int, errors)
    .query(`
      UPDATE DELTA_MIGRATION_BATCH
      SET STATUS = @status,
          PROCESSED_TOKENS = @processed,
          SUCCESS_COUNT = @success,
          ERROR_COUNT = @errors,
          UPDATED_AT = GETUTCDATE(),
          COMPLETED_AT = CASE WHEN @status IN ('COMPLETED', 'FAILED') THEN GETUTCDATE() ELSE NULL END
      WHERE BATCH_ID = @batchId
    `);
}

// Query for billing output generation
export async function getCompletedTokensForFile(fileId: string): Promise<any[]> {
  const db = await getPool();
  const result = await db.request()
    .input('fileId', sql.NVarChar(100), fileId)
    .query(`
      SELECT
        m.MONERIS_TOKEN, m.EXP_DATE, m.ENTITY_ID, m.ENTITY_TYPE,
        p.PG_TOKEN as PMR, p.CARD_BRAND, p.FIRST_SIX, p.LAST_FOUR, p.FUNDING_METHOD
      FROM MONERIS_TOKENS_STAGING m
      INNER JOIN PG_TOKENS_STAGING p ON m.MONERIS_TOKEN = p.MONERIS_TOKEN AND m.FILE_ID = p.FILE_ID
      WHERE m.FILE_ID = @fileId AND m.MIGRATION_STATUS = 'COMPLETED' AND p.STATUS = 'SUCCESS'
    `);
  return result.recordset;
}
