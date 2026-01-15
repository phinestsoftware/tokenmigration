/**
 * Duplicate Detection Service
 *
 * Handles detection of duplicate tokens that already exist in Payment Hub.
 * Issue #42: Should check PMR_MONERIS_MAPPING table instead of MONERIS_TOKENS_STAGING
 */

import { executeQuery, bulkUpdate, bulkInsertValues } from './database.js';
import { Logger } from '../utils/logger.js';
import { ValidationErrors } from './validationService.js';

// Audit message code for duplicate detection
const DUPLICATE_FOUND_CODE = 'DUP_FOUND';

/**
 * Interface for duplicate token information returned from query
 */
export interface DuplicateTokenInfo {
  ID: number;
  MONERIS_TOKEN: string;
  PMR: string | null;
}

/**
 * Interface for duplicate check result
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  monerisToken: string;
  existingPMR: string | null;
  errorMessage: string;
}

/**
 * Build the SQL query for checking existing tokens in Payment Hub
 *
 * Issue #42 FIX:
 * Now checks PMR_MONERIS_MAPPING table for existing tokens
 * and returns the PMR for error logging
 *
 * @param fileId - The file ID to check for duplicates
 * @returns SQL query string
 */
export function buildDuplicateCheckQuery(fileId: string): string {
  // FIXED: Check PMR_MONERIS_MAPPING for existing tokens
  // This ensures we detect duplicates based on actual Payment Hub data
  return `
    SELECT m.ID, m.MONERIS_TOKEN, pmm.PMR
    FROM MONERIS_TOKENS_STAGING m
    INNER JOIN PMR_MONERIS_MAPPING pmm ON pmm.MONERIS_TOKEN = m.MONERIS_TOKEN
    WHERE m.FILE_ID = '${fileId}'
      AND m.VALIDATION_STATUS = 'VALID'
  `;
}

/**
 * Check for existing tokens in Payment Hub
 *
 * @param fileId - The file ID to check
 * @param logger - Logger instance
 * @returns Number of duplicate tokens found
 */
export async function checkExistingTokensInPaymentHub(
  fileId: string,
  logger: Logger
): Promise<number> {
  const query = buildDuplicateCheckQuery(fileId);

  const result = await executeQuery<DuplicateTokenInfo>(query, { fileId });
  const duplicateTokens = result.recordset;

  if (duplicateTokens.length > 0) {
    // Bulk update duplicates
    const duplicateUpdates = duplicateTokens.map(token => ({
      ID: token.ID,
      VALIDATION_STATUS: 'DUPLICATE',
      ERROR_CODE: ValidationErrors.DUPLICATE_IN_PHUB,
    }));

    await bulkUpdate(
      'MONERIS_TOKENS_STAGING',
      'ID',
      duplicateUpdates,
      ['VALIDATION_STATUS', 'ERROR_CODE']
    );

    // Insert error details with PMR (when available)
    const errorDetails = duplicateTokens.map(token => ({
      FILE_ID: fileId,
      BATCH_ID: null,
      MONERIS_TOKEN: token.MONERIS_TOKEN,
      ENTITY_ID: null,
      ERROR_CODE: ValidationErrors.DUPLICATE_IN_PHUB,
      ERROR_MESSAGE: token.PMR
        ? `Duplicate: PMR ${token.PMR} already exists in Payment Hub`
        : 'Duplicate: Token already exists in Payment Hub',
      ERROR_TYPE: 'DUPLICATE',
    }));

    await bulkInsertValues(
      'MIGRATION_ERROR_DETAILS',
      ['FILE_ID', 'BATCH_ID', 'MONERIS_TOKEN', 'ENTITY_ID', 'ERROR_CODE', 'ERROR_MESSAGE', 'ERROR_TYPE'],
      errorDetails
    );

    logger.info('Found existing tokens in Payment Hub', { count: duplicateTokens.length });
  }

  return duplicateTokens.length;
}

/**
 * Insert audit log entry for duplicate detection
 */
export async function logDuplicateToAudit(
  fileId: string,
  monerisToken: string,
  pmr: string | null,
  logger: Logger
): Promise<void> {
  const messageText = pmr
    ? `Duplicate token found - MONERIS_TOKEN: ${monerisToken}, existing PMR: ${pmr}`
    : `Duplicate token found - MONERIS_TOKEN: ${monerisToken}`;

  await executeQuery(
    `INSERT INTO TOKEN_MIGRATION_AUDIT_LOG
     (FILE_ID, BATCH_ID, MESSAGE_CODE, MESSAGE_TEXT, ADDITIONAL_INFO, LOG_LEVEL)
     VALUES (@fileId, NULL, @messageCode, @messageText, @additionalInfo, 'DEBUG')`,
    {
      fileId,
      messageCode: DUPLICATE_FOUND_CODE,
      messageText,
      additionalInfo: JSON.stringify({ monerisToken, pmr }),
    }
  );

  logger.debug('Logged duplicate to audit', { monerisToken, pmr });
}
