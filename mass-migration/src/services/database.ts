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
  date: sql.Date,
  datetime2: sql.DateTime2,
  char: (length: number): sql.ISqlType => sql.Char(length),
};
