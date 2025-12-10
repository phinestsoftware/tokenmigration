import { MigrationStatusType } from '../config/index.js';

/**
 * PG (Payment Gateway/Mastercard) token response record
 */
export interface PgTokenRecord {
  apiOperation: string | null;
  correlationId: string; // Moneris token
  sourceOfFundsType: string | null;
  cardNumberMasked: string | null;
  expiryMonth: string | null;
  expiryYear: string | null;
  result: 'SUCCESS' | 'FAILURE';
  errorCause: string | null;
  errorExplanation: string | null;
  errorField: string | null;
  errorSupportCode: string | null;
  errorValidationType: string | null;
  token: string | null; // PG Token
  schemeTokenStatus: string | null;
  fundingMethod: string | null;
  expiry: string | null;
  cardScheme: string | null;
}

/**
 * PG token staging table record
 */
export interface PgTokenStaging {
  id?: number;
  fileId: string;
  batchId: string | null;
  monerisToken: string;
  pgToken: string | null;
  cardNumberMasked: string | null;
  cardBrand: string | null;
  firstSix: string | null;
  lastFour: string | null;
  fundingMethod: string | null;
  expDate: string | null;
  expMonth: string | null;
  expYear: string | null;
  result: string | null;
  errorCause: string | null;
  errorExplanation: string | null;
  errorField: string | null;
  errorSupportCode: string | null;
  schemeTokenStatus: string | null;
  migrationStatus: MigrationStatusType;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Convert PG token response to staging format
 */
export function toPgTokenStaging(
  record: PgTokenRecord,
  fileId: string,
  batchId?: string
): Omit<PgTokenStaging, 'id' | 'createdAt' | 'updatedAt'> {
  const { firstSix, lastFour } = parseCardNumber(record.cardNumberMasked);

  return {
    fileId,
    batchId: batchId ?? null,
    monerisToken: record.correlationId,
    pgToken: record.token,
    cardNumberMasked: record.cardNumberMasked,
    cardBrand: mapCardScheme(record.cardScheme),
    firstSix,
    lastFour,
    fundingMethod: record.fundingMethod,
    expDate: record.expiry,
    expMonth: record.expiryMonth,
    expYear: record.expiryYear,
    result: record.result,
    errorCause: record.errorCause,
    errorExplanation: record.errorExplanation,
    errorField: record.errorField,
    errorSupportCode: record.errorSupportCode,
    schemeTokenStatus: record.schemeTokenStatus,
    migrationStatus: record.result === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
  };
}

/**
 * Parse masked card number to extract first 6 and last 4
 */
function parseCardNumber(maskedNumber: string | null): { firstSix: string | null; lastFour: string | null } {
  if (!maskedNumber) return { firstSix: null, lastFour: null };

  // Format: 512345xxxxxx2346
  const cleaned = maskedNumber.replace(/x/gi, '');

  if (cleaned.length >= 10) {
    return {
      firstSix: cleaned.substring(0, 6),
      lastFour: cleaned.substring(cleaned.length - 4),
    };
  }

  // Try to parse from pattern
  const match = maskedNumber.match(/^(\d{6})x+(\d{4})$/i);
  if (match) {
    return {
      firstSix: match[1],
      lastFour: match[2],
    };
  }

  return { firstSix: null, lastFour: null };
}

/**
 * Map Mastercard scheme names to single-character codes
 */
function mapCardScheme(scheme: string | null): string | null {
  if (!scheme) return null;

  const schemeUpper = scheme.toUpperCase();
  switch (schemeUpper) {
    case 'VISA':
      return 'V';
    case 'MASTERCARD':
      return 'M';
    case 'AMEX':
    case 'AMERICAN EXPRESS':
      return 'A';
    default:
      return scheme.substring(0, 1);
  }
}

/**
 * CSV column mapping for Mastercard response file
 */
export const PgTokenCsvColumns = [
  'apiOperation',
  'correlationId',
  'sourceOfFunds.type',
  'sourceOfFunds.provided.card.number',
  'sourceOfFunds.provided.card.expiry.month',
  'sourceOfFunds.provided.card.expiry.year',
  'result',
  'error.cause',
  'error.explanation',
  'error.field',
  'error.supportCode',
  'error.validationType',
  'token',
  'schemeToken.status',
  'sourceOfFunds.provided.card.fundingMethod',
  'sourceOfFunds.provided.card.expiry',
  'sourceOfFunds.provided.card.scheme',
] as const;

/**
 * Map CSV row to PgTokenRecord
 */
export function mapCsvRowToPgToken(row: Record<string, string>): PgTokenRecord {
  return {
    apiOperation: row['apiOperation']?.trim() || null,
    correlationId: row['correlationId']?.trim() ?? '',
    sourceOfFundsType: row['sourceOfFunds.type']?.trim() || null,
    cardNumberMasked: row['sourceOfFunds.provided.card.number']?.trim() || null,
    expiryMonth: row['sourceOfFunds.provided.card.expiry.month']?.trim() || null,
    expiryYear: row['sourceOfFunds.provided.card.expiry.year']?.trim() || null,
    result: (row['result']?.trim() ?? 'FAILURE') as 'SUCCESS' | 'FAILURE',
    errorCause: row['error.cause']?.trim() || null,
    errorExplanation: row['error.explanation']?.trim() || null,
    errorField: row['error.field']?.trim() || null,
    errorSupportCode: row['error.supportCode']?.trim() || null,
    errorValidationType: row['error.validationType']?.trim() || null,
    token: row['token']?.trim() || null,
    schemeTokenStatus: row['schemeToken.status']?.trim() || null,
    fundingMethod: row['sourceOfFunds.provided.card.fundingMethod']?.trim() || null,
    expiry: row['sourceOfFunds.provided.card.expiry']?.trim() || null,
    cardScheme: row['sourceOfFunds.provided.card.scheme']?.trim() || null,
  };
}

/**
 * Billing response output record
 */
export interface BillingOutputRecord {
  monerisToken: string;
  expDate: string | null;
  entityId: string | null;
  entityRefType: string | null;
  pmr: string;
  cardBrand: string | null;
  firstSix: string | null;
  lastFour: string | null;
  fundingMethod: string | null;
}

/**
 * CSV columns for billing output file
 */
export const BillingOutputCsvColumns = [
  'MONERIS_TOKEN',
  'EXP_DATE',
  'ENTITY_ID',
  'ENTITY_REF_TYPE',
  'PMR',
  'CARD_BRAND',
  'FIRST_SIX',
  'LAST_FOUR',
  'FUNDING_METHOD',
] as const;

/**
 * Failure output record
 */
export interface FailureOutputRecord {
  monerisToken: string;
  expDate: string | null;
  entityId: string | null;
  entityRefType: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}
