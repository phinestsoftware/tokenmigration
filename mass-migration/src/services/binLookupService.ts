import { Logger, createLogger } from '../utils/logger.js';

const logger: Logger = createLogger('BinLookupService');

/**
 * BIN (Bank Identification Number) information
 */
export interface BinInfo {
  issuerName: string;
  cardLevel: string;
}

/**
 * BIN mapping database
 * In production, this would be loaded from a database or external service
 * Rogers Bank BIN mapping table
 */
const BIN_MAPPINGS: Map<string, BinInfo> = new Map([
  // Rogers Bank Credit Cards
  ['512345', { issuerName: 'Rogers Bank', cardLevel: 'Classic' }],
  ['512346', { issuerName: 'Rogers Bank', cardLevel: 'Gold' }],
  ['512347', { issuerName: 'Rogers Bank', cardLevel: 'Platinum' }],
  ['512348', { issuerName: 'Rogers Bank', cardLevel: 'World Elite' }],

  // Major Card Issuers (examples)
  ['451234', { issuerName: 'TD Bank', cardLevel: 'Standard' }],
  ['451235', { issuerName: 'TD Bank', cardLevel: 'Premium' }],
  ['411111', { issuerName: 'Visa Test', cardLevel: 'Test' }],
  ['555555', { issuerName: 'Mastercard Test', cardLevel: 'Test' }],

  // Add more BIN mappings as needed
]);

/**
 * Lookup BIN information from first 6 digits of card number
 * @param firstSix First 6 digits of card number
 * @returns BIN information or null if not found
 */
export function lookupBinInfo(firstSix: string | null): BinInfo | null {
  if (!firstSix || firstSix.length !== 6) {
    return null;
  }

  const binInfo = BIN_MAPPINGS.get(firstSix);

  if (!binInfo) {
    logger.warn('BIN not found in mapping table', { firstSix });
    // Return default values for unknown BINs
    return {
      issuerName: 'Unknown Issuer',
      cardLevel: 'Standard',
    };
  }

  return binInfo;
}

/**
 * Batch lookup BIN information for multiple cards
 * @param firstSixList Array of first 6 digits
 * @returns Map of firstSix to BIN info
 */
export function batchLookupBinInfo(firstSixList: string[]): Map<string, BinInfo> {
  const results = new Map<string, BinInfo>();

  for (const firstSix of firstSixList) {
    const info = lookupBinInfo(firstSix);
    if (info) {
      results.set(firstSix, info);
    }
  }

  logger.info('Batch BIN lookup completed', {
    total: firstSixList.length,
    found: results.size,
    missing: firstSixList.length - results.size,
  });

  return results;
}

/**
 * Add or update BIN mapping
 * For dynamic updates to the BIN database
 */
export function updateBinMapping(firstSix: string, binInfo: BinInfo): void {
  BIN_MAPPINGS.set(firstSix, binInfo);
  logger.info('BIN mapping updated', { firstSix, issuerName: binInfo.issuerName });
}

/**
 * Load BIN mappings from external source
 * In production, this would load from database or API
 */
export async function loadBinMappingsFromDatabase(): Promise<void> {
  // TODO: Implement database loader
  // Example:
  // const result = await executeQuery('SELECT BIN, ISSUER_NAME, CARD_LEVEL FROM BIN_MAPPINGS');
  // for (const row of result.recordset) {
  //   BIN_MAPPINGS.set(row.BIN, { issuerName: row.ISSUER_NAME, cardLevel: row.CARD_LEVEL });
  // }

  logger.info('BIN mappings loaded', { count: BIN_MAPPINGS.size });
}

/**
 * Get all available BIN prefixes
 */
export function getAvailableBins(): string[] {
  return Array.from(BIN_MAPPINGS.keys());
}

/**
 * Check if BIN exists in mapping
 */
export function hasBinMapping(firstSix: string): boolean {
  return BIN_MAPPINGS.has(firstSix);
}
