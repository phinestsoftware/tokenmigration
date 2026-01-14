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
const SQL_PARAM_LIMIT = 2100;

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
