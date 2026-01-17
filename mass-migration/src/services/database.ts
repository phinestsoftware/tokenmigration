import sql, { ConnectionPool, IResult, config as SqlConfig } from 'mssql';
import { getSqlConfig } from '../config/index.js';
import { Logger, createLogger } from '../utils/logger.js';

let pool: ConnectionPool | null = null;
const logger: Logger = createLogger('DatabaseService');

export async function getConnection(): Promise<ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const config: SqlConfig = {
    ...getSqlConfig(),
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    requestTimeout: 120000, // 2 minutes timeout for large bulk operations
    options: {
      ...getSqlConfig().options,
      enableArithAbort: true,
    },
  };

  try {
    pool = await sql.connect(config);
    logger.info('Database connection established');
    return pool;
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    logger.info('Database connection closed');
  }
}

export async function executeQuery<T>(
  query: string,
  params?: Record<string, unknown>
): Promise<IResult<T>> {
  const connection = await getConnection();
  const request = connection.request();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
  }

  return request.query<T>(query);
}

export async function executeProcedure<T>(
  procedureName: string,
  params?: Record<string, unknown>
): Promise<IResult<T>> {
  const connection = await getConnection();
  const request = connection.request();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
  }

  return request.execute<T>(procedureName);
}

/**
 * Execute a stored procedure with output parameters
 * Returns an object with the output parameter values
 */
export interface OutputParamConfig {
  type: 'int' | 'varchar' | 'bigint';
  direction: 'output';
  length?: number; // for varchar
}

export async function executeProcedureWithOutput<T extends Record<string, unknown>>(
  procedureName: string,
  inputParams: Record<string, unknown>,
  outputParams: Record<keyof T, OutputParamConfig>
): Promise<T> {
  const connection = await getConnection();
  const request = connection.request();

  // Add input parameters
  Object.entries(inputParams).forEach(([key, value]) => {
    request.input(key, value);
  });

  // Add output parameters
  Object.entries(outputParams).forEach(([key, config]) => {
    const paramConfig = config as OutputParamConfig;

    switch (paramConfig.type) {
      case 'int':
        request.output(key, sql.Int);
        break;
      case 'bigint':
        request.output(key, sql.BigInt);
        break;
      case 'varchar':
        request.output(key, sql.VarChar(paramConfig.length ?? 255));
        break;
      default:
        request.output(key, sql.VarChar(255));
    }
  });

  const result = await request.execute(procedureName);

  // Extract output parameter values
  const outputValues: Record<string, unknown> = {};
  Object.keys(outputParams).forEach((key) => {
    outputValues[key] = result.output[key];
  });

  return outputValues as T;
}

// Bulk insert helper
export async function bulkInsert<T extends Record<string, unknown>>(
  tableName: string,
  columns: { name: string; type: sql.ISqlType | (() => sql.ISqlType) }[],
  rows: T[]
): Promise<number> {
  if (rows.length === 0) return 0;

  const connection = await getConnection();
  const table = new sql.Table(tableName);
  table.create = false;

  columns.forEach((col) => {
    const colType = typeof col.type === 'function' ? col.type() : col.type;
    table.columns.add(col.name, colType, { nullable: true });
  });

  rows.forEach((row) => {
    const values = columns.map((col) => row[col.name] as string | number | boolean | Date | Buffer | null | undefined);
    table.rows.add(...values);
  });

  const request = connection.request();
  const result = await request.bulk(table);

  logger.info(`Bulk inserted ${result.rowsAffected} rows into ${tableName}`);
  return result.rowsAffected;
}

// Transaction helper
export async function executeTransaction<T>(
  operations: (transaction: sql.Transaction) => Promise<T>
): Promise<T> {
  const connection = await getConnection();
  const transaction = new sql.Transaction(connection);

  try {
    await transaction.begin();
    const result = await operations(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    logger.error('Transaction rolled back', error);
    throw error;
  }
}

// SQL types for common columns
export const SqlTypes = {
  varchar: (length: number): sql.ISqlType => sql.VarChar(length),
  nvarchar: (length: number): sql.ISqlType => sql.NVarChar(length),
  int: sql.Int,
  bigint: sql.BigInt,
  bit: sql.Bit,
  date: sql.Date,  // sql.Date is a factory function, called as sql.Date() in bulkInsert
  datetime2: sql.DateTime2,  // sql.DateTime2 is a factory function
  char: (length: number): sql.ISqlType => sql.Char(length),
};

// SQL Server limit is 2100 parameters per query
// Use 2000 to leave some buffer (some drivers/versions may have slightly lower limits)
const SQL_PARAM_LIMIT = 2000;

/**
 * Bulk UPDATE using a temp table and JOIN
 * This is much faster than individual UPDATE statements for large datasets
 *
 * @param tableName - Target table to update
 * @param keyColumn - Column name used for matching (e.g., 'ID')
 * @param updates - Array of objects with key and values to update
 * @param updateColumns - Columns to update (excluding the key)
 */
export async function bulkUpdate<T extends Record<string, unknown>>(
  tableName: string,
  keyColumn: string,
  updates: T[],
  updateColumns: string[]
): Promise<number> {
  if (updates.length === 0) return 0;

  const connection = await getConnection();
  let totalUpdated = 0;

  // Calculate safe chunk size: each row uses (1 key + N update columns) parameters
  const paramsPerRow = 1 + updateColumns.length;
  const chunkSize = Math.floor(SQL_PARAM_LIMIT / paramsPerRow);

  logger.info(`Bulk update: ${updates.length} rows in ${tableName}, chunk size ${chunkSize}`);

  // Process in chunks to avoid parameter limits and memory issues
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);

    // Build VALUES clause with parameters
    const valuesClauses: string[] = [];
    const request = connection.request();

    chunk.forEach((row, idx) => {
      const paramNames: string[] = [];

      // Add key column parameter
      const keyParamName = `key${idx}`;
      request.input(keyParamName, row[keyColumn]);
      paramNames.push(`@${keyParamName}`);

      // Add update column parameters
      updateColumns.forEach((col) => {
        const paramName = `${col.toLowerCase()}${idx}`;
        request.input(paramName, row[col]);
        paramNames.push(`@${paramName}`);
      });

      valuesClauses.push(`(${paramNames.join(', ')})`);
    });

    // Build column list for temp table
    const tempColumns = [keyColumn, ...updateColumns].join(', ');

    // Build SET clause
    const setClauses = updateColumns.map(col => `t.${col} = s.${col}`).join(', ');

    // Build the UPDATE query with VALUES as source
    const query = `
      UPDATE t
      SET ${setClauses}, t.UPDATED_AT = GETUTCDATE()
      FROM ${tableName} t
      INNER JOIN (VALUES ${valuesClauses.join(', ')}) AS s(${tempColumns})
      ON t.${keyColumn} = s.${keyColumn}
    `;

    const result = await request.query(query);
    totalUpdated += result.rowsAffected[0] || 0;
  }

  logger.info(`Bulk updated ${totalUpdated} rows in ${tableName}`);
  return totalUpdated;
}

/**
 * Bulk INSERT using a multi-row VALUES clause
 * More efficient than individual INSERT statements
 *
 * @param tableName - Target table
 * @param columns - Column names to insert
 * @param rows - Array of objects with column values
 */
export async function bulkInsertValues<T extends Record<string, unknown>>(
  tableName: string,
  columns: string[],
  rows: T[]
): Promise<number> {
  if (rows.length === 0) return 0;

  const connection = await getConnection();
  let totalInserted = 0;

  // Calculate safe chunk size based on number of columns
  const chunkSize = Math.floor(SQL_PARAM_LIMIT / columns.length);

  logger.info(`Bulk insert: ${rows.length} rows into ${tableName}, chunk size ${chunkSize}`);

  // Process in chunks
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const valuesClauses: string[] = [];
    const request = connection.request();

    chunk.forEach((row, idx) => {
      const paramNames: string[] = [];

      columns.forEach((col) => {
        const paramName = `${col.toLowerCase()}${idx}`;
        request.input(paramName, row[col]);
        paramNames.push(`@${paramName}`);
      });

      valuesClauses.push(`(${paramNames.join(', ')})`);
    });

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${valuesClauses.join(', ')}
    `;

    const result = await request.query(query);
    totalInserted += result.rowsAffected[0] || 0;
  }

  logger.info(`Bulk inserted ${totalInserted} rows into ${tableName}`);
  return totalInserted;
}

/**
 * Column definition for true bulk insert
 */
export interface BulkColumnDef {
  name: string;
  type: sql.ISqlType | (() => sql.ISqlType);
  nullable?: boolean;
}

/**
 * True bulk insert using SQL Server's bulk insert mechanism
 * Much faster than parameterized INSERT statements for large datasets
 *
 * @param tableName - Target table
 * @param columns - Column definitions with name and SQL type
 * @param rows - Array of objects with column values
 */
export async function trueBulkInsert<T extends Record<string, unknown>>(
  tableName: string,
  columns: BulkColumnDef[],
  rows: T[]
): Promise<number> {
  if (rows.length === 0) return 0;

  const connection = await getConnection();
  const table = new sql.Table(tableName);
  table.create = false;

  // Add column definitions
  columns.forEach((col) => {
    const colType = typeof col.type === 'function' ? col.type() : col.type;
    table.columns.add(col.name, colType, { nullable: col.nullable !== false });
  });

  // Add rows
  rows.forEach((row) => {
    const values = columns.map((col) => {
      const value = row[col.name];
      // Convert undefined to null for SQL, cast to valid bulk insert type
      return (value === undefined ? null : value) as string | number | boolean | Date | Buffer | null;
    });
    table.rows.add(...values);
  });

  const request = connection.request();
  const result = await request.bulk(table);

  logger.info(`True bulk inserted ${result.rowsAffected} rows into ${tableName}`);
  return result.rowsAffected;
}

/**
 * Bulk insert Mastercard response CSV from blob storage using SQL Server BULK INSERT
 * This is MUCH faster than row-by-row inserts - can handle millions of records in minutes
 *
 * Flow:
 * 1. BULK INSERT CSV into temp table with IDENTITY column (for chunking)
 * 2. INSERT...SELECT into PG_TOKENS_STAGING in chunks (100K rows each) to avoid LOG_RATE_GOVERNOR
 * 3. Derived columns (FIRST_SIX, LAST_FOUR, CC_CARD_BRAND) computed during INSERT
 *
 * @param blobContainerName - Container name (e.g., 'mastercard-mapping')
 * @param blobPath - Path within container (e.g., 'responses/file.csv')
 * @param fileId - File ID to tag all records
 * @param batchId - Optional batch ID
 */
export async function bulkInsertMcResponse(
  blobContainerName: string,
  blobPath: string,
  fileId: string,
  batchId: string | null = null
): Promise<{ rowsInserted: number; rowsUpdated: number }> {
  // Use global temp table for BULK INSERT (minimal logging in tempdb = fast)
  // Then INSERT to permanent table in sequential chunks (same connection)
  const tempTableName = `##MC_RESP_${fileId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Create dedicated connection pool with extended timeout for large file BULK INSERT
  // Single connection because global temp tables are session-scoped
  const config: sql.config = {
    ...getSqlConfig(),
    requestTimeout: 600000, // 10 minutes per batch (chunked inserts are faster)
    connectionTimeout: 60000, // 1 minute to connect
    pool: {
      max: 1, // Single connection - temp table is session-scoped
      min: 1,
      idleTimeoutMillis: 600000,
    },
    options: {
      ...getSqlConfig().options,
      enableArithAbort: true,
    },
  };

  // Use new ConnectionPool to ensure we get a fresh connection with our timeout settings
  const dedicatedPool = new sql.ConnectionPool(config);
  await dedicatedPool.connect();
  logger.info('Created dedicated connection for BULK INSERT', {
    requestTimeout: config.requestTimeout,
  });

  try {
    logger.info(`Starting BULK INSERT for ${blobContainerName}/${blobPath}`);

    // Step 1: Create global temp table with IDENTITY column for chunking
    // Global temp tables use minimal logging in tempdb = much faster BULK INSERT
    // Non-XML format file maps CSV columns to table columns 2-18, skipping row_id (column 1)
    const createTempTable = `
      IF OBJECT_ID('tempdb..${tempTableName}') IS NOT NULL DROP TABLE ${tempTableName};

      CREATE TABLE ${tempTableName} (
        [row_id] INT IDENTITY(1,1) NOT NULL,
        [apiOperation] VARCHAR(50) NULL,
        [correlationId] VARCHAR(32) NULL,
        [sourceOfFundsType] VARCHAR(50) NULL,
        [cardNumber] VARCHAR(20) NULL,
        [expiryMonth] VARCHAR(2) NULL,
        [expiryYear] VARCHAR(2) NULL,
        [result] VARCHAR(20) NULL,
        [errorCause] VARCHAR(50) NULL,
        [errorExplanation] VARCHAR(255) NULL,
        [errorField] VARCHAR(50) NULL,
        [errorSupportCode] VARCHAR(20) NULL,
        [errorValidationType] VARCHAR(50) NULL,
        [token] VARCHAR(32) NULL,
        [schemeTokenStatus] VARCHAR(50) NULL,
        [fundingMethod] VARCHAR(20) NULL,
        [expiry] VARCHAR(20) NULL,
        [cardScheme] VARCHAR(20) NULL
      );
    `;

    await dedicatedPool.request().query(createTempTable);
    logger.info('Global temp table created with IDENTITY column', { tempTableName });

    // Step 2: BULK INSERT from blob storage using non-XML format file
    // Format file maps 17 CSV columns to table columns 2-18, skipping row_id (column 1)
    // Non-XML format files work better with Azure SQL external data sources
    const bulkInsertQuery = `
      BULK INSERT ${tempTableName}
      FROM '${blobContainerName}/${blobPath}'
      WITH (
        DATA_SOURCE = 'McResponseBlobStorage',
        FORMATFILE = 'mastercard-mapping/mc_response_temp.fmt',
        FORMATFILE_DATA_SOURCE = 'McResponseBlobStorage',
        FIRSTROW = 2,
        TABLOCK,
        MAXERRORS = 0
      );
    `;

    logger.info('Starting BULK INSERT with format file...');
    const bulkStartTime = Date.now();
    await dedicatedPool.request().query(bulkInsertQuery);
    const bulkDuration = ((Date.now() - bulkStartTime) / 1000).toFixed(1);
    logger.info(`BULK INSERT completed in ${bulkDuration}s`);

    // Step 3: Get row count from temp table
    const countResult = await dedicatedPool.request().query<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM ${tempTableName}`);
    const tempRowCount = countResult.recordset[0]?.cnt || 0;
    logger.info(`Global temp table has ${tempRowCount} rows`);

    // Step 4: INSERT...SELECT into PG_TOKENS_STAGING in PARALLEL chunks
    // Run multiple chunks concurrently to maximize throughput
    // While one chunk waits on LOG_RATE_GOVERNOR, others can execute
    // 200K chunks - balance between speed and avoiding log rate throttling on P1
    const CHUNK_SIZE = 200000;
    const numChunks = Math.ceil(tempRowCount / CHUNK_SIZE);

    logger.info(`Starting chunked INSERT: ${tempRowCount} rows in ${numChunks} chunks of ${CHUNK_SIZE}`);
    const insertStartTime = Date.now();

    // Process chunks sequentially (single connection for temp table access)
    let totalRowsInserted = 0;
    for (let chunkNum = 0; chunkNum < numChunks; chunkNum++) {
      const startRow = chunkNum * CHUNK_SIZE + 1;
      const endRow = Math.min((chunkNum + 1) * CHUNK_SIZE, tempRowCount);

      const chunkRequest = dedicatedPool.request();
      chunkRequest.input('fileId', fileId);
      chunkRequest.input('batchId', batchId);
      chunkRequest.input('startRow', sql.Int, startRow);
      chunkRequest.input('endRow', sql.Int, endRow);

      const insertQuery = `
        INSERT INTO PG_TOKENS_STAGING (
          FILE_ID, BATCH_ID, MONERIS_TOKEN, PG_TOKEN,
          CARD_NUMBER_MASKED, FUNDING_METHOD, EXP_MONTH, EXP_YEAR,
          ERROR_CAUSE, ERROR_EXPLANATION, ERROR_FIELD, ERROR_SUPPORT_CODE,
          MIGRATION_STATUS, NETWORK_TOKEN_STATUS, CC_EXP_DATE,
          APIOPERATION, SOURCEOFFUNDS_TYPE, SOURCEOFFUNDS_NUMBER,
          MONERIS_EXPIRY_MONTH, MONERIS_EXPIRY_YEAR, MONERIS2PG_MIGRATION_STATUS,
          FIRST_SIX, LAST_FOUR, CC_CARD_BRAND,
          CREATED_AT
        )
        SELECT
          @fileId,
          @batchId,
          t.correlationId,
          t.token,
          t.cardNumber,
          t.fundingMethod,
          t.expiryMonth,
          t.expiryYear,
          t.errorCause,
          t.errorExplanation,
          t.errorField,
          t.errorSupportCode,
          CASE WHEN t.result = 'SUCCESS' THEN 'COMPLETED' ELSE 'FAILED' END,
          t.schemeTokenStatus,
          t.expiry,
          t.apiOperation,
          t.sourceOfFundsType,
          t.cardNumber,
          t.expiryMonth,
          t.expiryYear,
          t.result,
          CASE
            WHEN t.cardNumber IS NOT NULL AND LEN(REPLACE(t.cardNumber, 'x', '')) >= 10
            THEN LEFT(REPLACE(t.cardNumber, 'x', ''), 6)
            ELSE NULL
          END,
          CASE
            WHEN t.cardNumber IS NOT NULL AND LEN(REPLACE(t.cardNumber, 'x', '')) >= 10
            THEN RIGHT(REPLACE(t.cardNumber, 'x', ''), 4)
            ELSE NULL
          END,
          CASE UPPER(RTRIM(t.cardScheme))
            WHEN 'VISA' THEN 'V'
            WHEN 'MASTERCARD' THEN 'M'
            WHEN 'AMEX' THEN 'A'
            WHEN 'AMERICAN EXPRESS' THEN 'A'
            ELSE LEFT(RTRIM(t.cardScheme), 1)
          END,
          GETUTCDATE()
        FROM ${tempTableName} t
        WHERE t.row_id BETWEEN @startRow AND @endRow
          AND t.correlationId IS NOT NULL
          AND LEN(LTRIM(RTRIM(t.correlationId))) > 0;
      `;

      const chunkStartTime = Date.now();
      const insertResult = await chunkRequest.query(insertQuery);
      const chunkRowsInserted = insertResult.rowsAffected[0] || 0;
      totalRowsInserted += chunkRowsInserted;
      const chunkDuration = ((Date.now() - chunkStartTime) / 1000).toFixed(1);

      logger.info(`Chunk ${chunkNum + 1}/${numChunks} completed: ${chunkRowsInserted} rows in ${chunkDuration}s (rows ${startRow}-${endRow})`);
    }

    const insertDuration = ((Date.now() - insertStartTime) / 1000).toFixed(1);
    logger.info(`All chunks completed: ${totalRowsInserted} rows inserted in ${insertDuration}s`);

    // Cleanup temp table
    await dedicatedPool.request().query(`DROP TABLE IF EXISTS ${tempTableName}`);
    logger.info('Temp table cleaned up');

    return { rowsInserted: totalRowsInserted, rowsUpdated: totalRowsInserted };
  } catch (error) {
    // Attempt to clean up temp table on error
    try {
      await dedicatedPool.request().query(`DROP TABLE IF EXISTS ${tempTableName}`);
    } catch (cleanupError) {
      logger.warn('Failed to clean up temp table on error', { error: String(cleanupError) });
    }
    throw error;
  } finally {
    // Always close the dedicated pool
    await dedicatedPool.close();
    logger.info('Dedicated BULK INSERT connection closed');
  }
}
