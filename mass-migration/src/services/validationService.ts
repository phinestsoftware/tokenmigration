import { ValidationStatus, ValidationStatusType } from '../config/index.js';
import { MonerisTokenRecord } from '../models/monerisToken.js';
import { Logger, createLogger } from '../utils/logger.js';

const logger: Logger = createLogger('ValidationService');

export interface ValidationResult {
  isValid: boolean;
  status: ValidationStatusType;
  errorCode?: string;
  errorMessage?: string;
}

export interface TokenValidationResult extends ValidationResult {
  token: string;
}

// Error codes
export const ValidationErrors = {
  INVALID_TOKEN_FORMAT: 'E001',
  INVALID_TOKEN_LENGTH: 'E002',
  INVALID_TOKEN_PREFIX: 'E003',
  MISSING_MANDATORY_FIELD: 'E004',
  INVALID_EXPIRY_DATE: 'E005',
  EXPIRED_TOKEN: 'E006',
  DUPLICATE_TOKEN: 'E007',
  DUPLICATE_IN_PHUB: 'E008',
  INVALID_ENTITY_TYPE: 'E009',
  INVALID_ENTITY_STATUS: 'E010',
} as const;

/**
 * Validate a single Moneris token format
 */
export function validateMonerisToken(token: string): ValidationResult {
  // Check if token is provided
  if (!token || token.trim() === '') {
    return {
      isValid: false,
      status: ValidationStatus.INVALID,
      errorCode: ValidationErrors.INVALID_TOKEN_FORMAT,
      errorMessage: 'Token is empty or missing',
    };
  }

  // Check token length (must be 16 digits)
  if (token.length !== 16) {
    return {
      isValid: false,
      status: ValidationStatus.INVALID,
      errorCode: ValidationErrors.INVALID_TOKEN_LENGTH,
      errorMessage: `Token must be 16 digits, got ${token.length}`,
    };
  }

  // Check if token is numeric
  if (!/^\d+$/.test(token)) {
    return {
      isValid: false,
      status: ValidationStatus.INVALID,
      errorCode: ValidationErrors.INVALID_TOKEN_FORMAT,
      errorMessage: 'Token must contain only digits',
    };
  }

  // Check token prefix (must start with 9)
  if (!token.startsWith('9')) {
    return {
      isValid: false,
      status: ValidationStatus.INVALID,
      errorCode: ValidationErrors.INVALID_TOKEN_PREFIX,
      errorMessage: 'Moneris token must start with 9',
    };
  }

  return {
    isValid: true,
    status: ValidationStatus.VALID,
  };
}

/**
 * Split expiry date (MMYY) into month and year components
 * Used for splitting EXP_DATE into EXP_DATE_MM and EXP_DATE_YY
 */
export interface SplitExpiryDate {
  mm: string;
  yy: string;
}

export function splitExpiryDate(expDate: string | null | undefined): SplitExpiryDate | null {
  if (!expDate || expDate.length !== 4) {
    return null;
  }

  return {
    mm: expDate.substring(0, 2),
    yy: expDate.substring(2, 4),
  };
}

/**
 * Validate expiry date format (MMYY)
 */
export function validateExpiryDate(expDate: string | null | undefined): ValidationResult {
  if (!expDate) {
    // Expiry date is optional
    return { isValid: true, status: ValidationStatus.VALID };
  }

  // Check format MMYY
  if (!/^\d{4}$/.test(expDate)) {
    return {
      isValid: false,
      status: ValidationStatus.INVALID,
      errorCode: ValidationErrors.INVALID_EXPIRY_DATE,
      errorMessage: 'Expiry date must be in MMYY format',
    };
  }

  const month = parseInt(expDate.substring(0, 2), 10);
  const year = parseInt(expDate.substring(2, 4), 10);

  // Validate month
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      status: ValidationStatus.INVALID,
      errorCode: ValidationErrors.INVALID_EXPIRY_DATE,
      errorMessage: 'Invalid month in expiry date',
    };
  }

  // Check if expired (optional - may still want to migrate expired tokens)
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  // Assuming 2000s century
  const fullYear = year + 2000;
  const expiry = new Date(fullYear, month - 1);
  const current = new Date(now.getFullYear(), currentMonth - 1);

  if (expiry < current) {
    // Return as valid but log warning - we may still want to migrate expired tokens
    logger.warn('Token has expired expiry date', { expDate, year, month });
  }

  return { isValid: true, status: ValidationStatus.VALID };
}

/**
 * Validate entity type
 */
export function validateEntityType(entityType: string | null | undefined): ValidationResult {
  if (!entityType) {
    return { isValid: true, status: ValidationStatus.VALID }; // Optional
  }

  if (!['1', '2'].includes(entityType)) {
    return {
      isValid: false,
      status: ValidationStatus.INVALID,
      errorCode: ValidationErrors.INVALID_ENTITY_TYPE,
      errorMessage: 'Entity type must be 1 (Account) or 2 (GUID)',
    };
  }

  return { isValid: true, status: ValidationStatus.VALID };
}

/**
 * Validate entity status
 */
export function validateEntityStatus(entityStatus: string | null | undefined): ValidationResult {
  if (!entityStatus) {
    return { isValid: true, status: ValidationStatus.VALID }; // Optional
  }

  if (!['O', 'S', 'N', 'C'].includes(entityStatus)) {
    return {
      isValid: false,
      status: ValidationStatus.INVALID,
      errorCode: ValidationErrors.INVALID_ENTITY_STATUS,
      errorMessage: 'Entity status must be O, S, N, or C',
    };
  }

  return { isValid: true, status: ValidationStatus.VALID };
}

/**
 * Validate a complete Moneris token record
 */
export function validateMonerisTokenRecord(record: MonerisTokenRecord): ValidationResult {
  // Validate token format
  const tokenResult = validateMonerisToken(record.monerisToken);
  if (!tokenResult.isValid) {
    return tokenResult;
  }

  // Validate expiry date
  const expiryResult = validateExpiryDate(record.expDate);
  if (!expiryResult.isValid) {
    return expiryResult;
  }

  // Validate entity type
  const entityTypeResult = validateEntityType(record.entityType);
  if (!entityTypeResult.isValid) {
    return entityTypeResult;
  }

  // Validate entity status
  const entityStatusResult = validateEntityStatus(record.entitySts);
  if (!entityStatusResult.isValid) {
    return entityStatusResult;
  }

  return { isValid: true, status: ValidationStatus.VALID };
}

/**
 * Batch validate multiple tokens
 */
export function validateTokenBatch(records: MonerisTokenRecord[]): {
  valid: MonerisTokenRecord[];
  invalid: Array<{ record: MonerisTokenRecord; result: ValidationResult }>;
  duplicates: MonerisTokenRecord[];
} {
  const valid: MonerisTokenRecord[] = [];
  const invalid: Array<{ record: MonerisTokenRecord; result: ValidationResult }> = [];
  const duplicates: MonerisTokenRecord[] = [];
  const seenTokens = new Set<string>();

  for (const record of records) {
    // Check for duplicates in batch
    if (seenTokens.has(record.monerisToken)) {
      duplicates.push(record);
      continue;
    }
    seenTokens.add(record.monerisToken);

    const result = validateMonerisTokenRecord(record);
    if (result.isValid) {
      valid.push(record);
    } else {
      invalid.push({ record, result });
    }
  }

  logger.info('Batch validation completed', {
    total: records.length,
    valid: valid.length,
    invalid: invalid.length,
    duplicates: duplicates.length,
  });

  return { valid, invalid, duplicates };
}

/**
 * Check if failure threshold is exceeded
 */
export function isFailureThresholdExceeded(
  totalCount: number,
  failureCount: number,
  thresholdPercent: number
): boolean {
  if (totalCount === 0) return false;
  const failurePercent = (failureCount / totalCount) * 100;
  return failurePercent > thresholdPercent;
}
