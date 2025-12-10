import { ValidationStatusType, MigrationStatusType } from '../config/index.js';

/**
 * Raw input record from Moneris token file
 */
export interface MonerisTokenRecord {
  monerisToken: string;
  expDate: string | null;
  entityId: string | null;
  entityType: string | null;
  entitySts: string | null;
  creationDate: string | null;
  lastUseDate: string | null;
  trxSeqNo: string | null;
  businessUnit: string | null;
}

/**
 * Moneris token staging table record
 */
export interface MonerisTokenStaging {
  id?: number;
  fileId: string;
  batchId: string | null;
  monerisToken: string;
  expDate: string | null;
  entityId: string | null;
  entityType: string | null;
  entitySts: string | null;
  creationDate: Date | null;
  lastUseDate: Date | null;
  trxSeqNo: string | null;
  businessUnit: string | null;
  validationStatus: ValidationStatusType;
  migrationStatus: MigrationStatusType;
  errorCode: string | null;
  pmr: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * Convert raw record to staging format
 */
export function toMonerisTokenStaging(
  record: MonerisTokenRecord,
  fileId: string
): Omit<MonerisTokenStaging, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    fileId,
    batchId: null,
    monerisToken: record.monerisToken,
    expDate: record.expDate,
    entityId: record.entityId,
    entityType: record.entityType,
    entitySts: record.entitySts,
    creationDate: record.creationDate ? parseDate(record.creationDate) : null,
    lastUseDate: record.lastUseDate ? parseDate(record.lastUseDate) : null,
    trxSeqNo: record.trxSeqNo,
    businessUnit: record.businessUnit,
    validationStatus: 'PENDING',
    migrationStatus: 'PENDING',
    errorCode: null,
    pmr: null,
    updatedBy: 'SYSTEM',
  };
}

/**
 * Parse date string (YYYYMMDD) to Date object
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.length !== 8) return null;

  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1;
  const day = parseInt(dateStr.substring(6, 8), 10);

  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * CSV column mapping for input file
 */
export const MonerisTokenCsvColumns = [
  'MONERIS_TOKEN',
  'EXP_DATE',
  'ENTITY_ID',
  'ENTITY_TYPE',
  'ENTITY_STS',
  'CREATION_DATE',
  'LAST_USE_DATE',
  'TRX_SEQ_NO',
  'BUSINESS_UNIT',
] as const;

/**
 * Map CSV row to MonerisTokenRecord
 */
export function mapCsvRowToMonerisToken(row: Record<string, string>): MonerisTokenRecord {
  return {
    monerisToken: row['MONERIS_TOKEN']?.trim() ?? '',
    expDate: row['EXP_DATE']?.trim() || null,
    entityId: row['ENTITY_ID']?.trim() || null,
    entityType: row['ENTITY_TYPE']?.trim() || null,
    entitySts: row['ENTITY_STS']?.trim() || null,
    creationDate: row['CREATION_DATE']?.trim() || null,
    lastUseDate: row['LAST_USE_DATE']?.trim() || null,
    trxSeqNo: row['TRX_SEQ_NO']?.trim() || null,
    businessUnit: row['BUSINESS_UNIT']?.trim() || null,
  };
}

/**
 * Trailer record structure
 */
export interface FileTrailer {
  transactionCount: number;
  timestamp: string;
}

/**
 * Parse trailer line
 */
export function parseTrailer(line: string): FileTrailer | null {
  const parts = line.split(',');
  if (parts.length < 2) return null;

  const count = parseInt(parts[0], 10);
  const timestamp = parts[1];

  if (isNaN(count)) return null;

  return {
    transactionCount: count,
    timestamp,
  };
}
