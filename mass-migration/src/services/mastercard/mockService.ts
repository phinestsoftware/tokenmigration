import { Config, getConfig } from '../../config/index.js';
import { uploadBlob } from '../blobStorage.js';
import { executeQuery } from '../database.js';
import { Logger, createLogger } from '../../utils/logger.js';
import { generateCsv } from '../../utils/fileParser.js';
import { PgTokenCsvColumns, toPgTokenStaging } from '../../models/pgToken.js';
import { parseFileName } from '../../models/migrationBatch.js';

const logger: Logger = createLogger('MockMastercardService');

interface TokenForMock {
  MONERIS_TOKEN: string;
  EXP_DATE: string | null;
}

interface MockMcResponse {
  apiOperation: string;
  correlationId: string;
  'sourceOfFunds.type': string;
  'sourceOfFunds.provided.card.number': string;
  'sourceOfFunds.provided.card.expiry.month': string;
  'sourceOfFunds.provided.card.expiry.year': string;
  result: string;
  'error.cause': string;
  'error.explanation': string;
  'error.field': string;
  'error.supportCode': string;
  'error.validationType': string;
  token: string;
  'schemeToken.status': string;
  'sourceOfFunds.provided.card.fundingMethod': string;
  'sourceOfFunds.provided.card.expiry': string;
  'sourceOfFunds.provided.card.scheme': string;
}

/**
 * Trigger mock Mastercard response generation
 * This simulates what Mastercard would return after processing our input file
 */
export async function triggerMockMastercardResponse(
  fileId: string,
  tokens: TokenForMock[],
  sourceId: string,
  config: Config
): Promise<void> {
  logger.info('Generating mock Mastercard response', {
    fileId,
    tokenCount: tokens.length,
  });

  // Simulate delay
  if (config.MOCK_MASTERCARD_DELAY_MS > 0) {
    await sleep(config.MOCK_MASTERCARD_DELAY_MS);
  }

  // Generate mock responses
  const responses = tokens.map((token) => generateMockResponse(token));

  // Calculate success/failure stats
  const successCount = responses.filter((r) => r.result === 'SUCCESS').length;
  const failureCount = responses.filter((r) => r.result === 'FAILURE').length;

  logger.info('Mock responses generated', {
    total: responses.length,
    success: successCount,
    failure: failureCount,
  });

  // Option 1: Generate file and upload to mastercard-mapping container
  // This would trigger the uploadFile function automatically
  const mcResponseContent = generateMockResponseFile(responses);
  const parsedFile = parseFileName(fileId);
  const responseFileName = parsedFile
    ? `${parsedFile.sourceId}.${parsedFile.tokenType}.${parsedFile.date}.${parsedFile.sequence}.mc.response`
    : `${fileId}.mc.response`;

  await uploadBlob(
    config.MASTERCARD_MAPPING_CONTAINER,
    responseFileName,
    mcResponseContent
  );

  logger.info('Mock MC response file uploaded', { fileName: responseFileName });

  // Option 2: Directly insert to PG_TOKENS_STAGING (faster for testing)
  await insertMockResponsesToStaging(fileId, responses);

  logger.info('Mock responses inserted to staging');
}

/**
 * Generate a mock Mastercard response for a single token
 */
function generateMockResponse(token: TokenForMock): MockMcResponse {
  // Simulate ~95% success rate with random failures
  const isSuccess = Math.random() < 0.95;

  // Generate mock PG token (16 digits starting with 9)
  const pgToken = generateMockPgToken();

  // Generate mock card details
  const cardDetails = generateMockCardDetails();

  // Parse expiry date
  const expMonth = token.EXP_DATE?.substring(0, 2) ?? '';
  const expYear = token.EXP_DATE?.substring(2, 4) ?? '';

  if (isSuccess) {
    return {
      apiOperation: '',
      correlationId: token.MONERIS_TOKEN,
      'sourceOfFunds.type': 'CARD',
      'sourceOfFunds.provided.card.number': cardDetails.maskedNumber,
      'sourceOfFunds.provided.card.expiry.month': '',
      'sourceOfFunds.provided.card.expiry.year': '',
      result: 'SUCCESS',
      'error.cause': '',
      'error.explanation': '',
      'error.field': '',
      'error.supportCode': '',
      'error.validationType': '',
      token: pgToken,
      'schemeToken.status': 'PROVISIONING',
      'sourceOfFunds.provided.card.fundingMethod': cardDetails.fundingMethod,
      'sourceOfFunds.provided.card.expiry': token.EXP_DATE ?? '',
      'sourceOfFunds.provided.card.scheme': cardDetails.scheme,
    };
  } else {
    // Generate random failure
    const failure = generateRandomFailure();
    return {
      apiOperation: '',
      correlationId: token.MONERIS_TOKEN,
      'sourceOfFunds.type': 'CARD',
      'sourceOfFunds.provided.card.number': '',
      'sourceOfFunds.provided.card.expiry.month': '',
      'sourceOfFunds.provided.card.expiry.year': '',
      result: 'FAILURE',
      'error.cause': failure.cause,
      'error.explanation': failure.explanation,
      'error.field': failure.field,
      'error.supportCode': failure.supportCode,
      'error.validationType': failure.validationType,
      token: '',
      'schemeToken.status': '',
      'sourceOfFunds.provided.card.fundingMethod': '',
      'sourceOfFunds.provided.card.expiry': token.EXP_DATE ?? '',
      'sourceOfFunds.provided.card.scheme': '',
    };
  }
}

/**
 * Generate mock PG token
 */
function generateMockPgToken(): string {
  const timestamp = Date.now().toString().slice(-12);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `9${timestamp}${random}`;
}

/**
 * Generate mock card details
 */
function generateMockCardDetails(): {
  maskedNumber: string;
  firstSix: string;
  lastFour: string;
  scheme: string;
  fundingMethod: string;
} {
  // Random card type distribution
  const rand = Math.random();
  let scheme: string;
  let firstSix: string;

  if (rand < 0.4) {
    scheme = 'VISA';
    firstSix = ['450875', '401200', '411111', '453211'][Math.floor(Math.random() * 4)];
  } else if (rand < 0.8) {
    scheme = 'MASTERCARD';
    firstSix = ['512345', '511111', '520000', '540000'][Math.floor(Math.random() * 4)];
  } else {
    scheme = 'AMEX';
    firstSix = ['372546', '371449', '378282', '340000'][Math.floor(Math.random() * 4)];
  }

  const lastFour = Math.floor(1000 + Math.random() * 9000).toString();
  const maskedNumber = `${firstSix}xxxxxx${lastFour}`;

  // Random funding method
  const fundingMethods = ['CREDIT', 'DEBIT', 'CREDIT', 'CREDIT']; // Weighted towards credit
  const fundingMethod = fundingMethods[Math.floor(Math.random() * fundingMethods.length)];

  return { maskedNumber, firstSix, lastFour, scheme, fundingMethod };
}

/**
 * Generate random failure details
 */
function generateRandomFailure(): {
  cause: string;
  explanation: string;
  field: string;
  supportCode: string;
  validationType: string;
} {
  const failures = [
    {
      cause: 'INVALID_CARD',
      explanation: 'Card number validation failed',
      field: 'sourceOfFunds.provided.card.number',
      supportCode: 'E001',
      validationType: 'LUHN_CHECK',
    },
    {
      cause: 'EXPIRED_CARD',
      explanation: 'Card has expired',
      field: 'sourceOfFunds.provided.card.expiry',
      supportCode: 'E002',
      validationType: 'EXPIRY_CHECK',
    },
    {
      cause: 'INVALID_EXPIRY',
      explanation: 'Invalid expiry date format',
      field: 'sourceOfFunds.provided.card.expiry',
      supportCode: 'E003',
      validationType: 'FORMAT_CHECK',
    },
    {
      cause: 'DECLINED',
      explanation: 'Card declined by issuer',
      field: '',
      supportCode: 'E004',
      validationType: 'ISSUER_CHECK',
    },
  ];

  return failures[Math.floor(Math.random() * failures.length)];
}

/**
 * Generate mock response file content
 */
function generateMockResponseFile(responses: MockMcResponse[]): string {
  const columns = [
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
  ];

  return generateCsv(responses as unknown as Record<string, unknown>[], columns, { includeHeader: true });
}

/**
 * Insert mock responses directly to PG_TOKENS_STAGING
 * Note: Uses parameterized INSERT instead of bulkInsert due to BCP identity column issues
 */
async function insertMockResponsesToStaging(
  fileId: string,
  responses: MockMcResponse[]
): Promise<void> {
  if (responses.length === 0) {
    logger.info('No responses to insert to staging');
    return;
  }

  const rows = responses.map((r) => {
    const maskedNumber = r['sourceOfFunds.provided.card.number'];
    let firstSix = '';
    let lastFour = '';

    if (maskedNumber && maskedNumber.length >= 10) {
      firstSix = maskedNumber.substring(0, 6);
      lastFour = maskedNumber.slice(-4);
    }

    // Map scheme to single character
    let cardBrand = '';
    const scheme = r['sourceOfFunds.provided.card.scheme'];
    if (scheme === 'VISA') cardBrand = 'V';
    else if (scheme === 'MASTERCARD') cardBrand = 'M';
    else if (scheme === 'AMEX') cardBrand = 'A';

    return {
      FILE_ID: fileId,
      MONERIS_TOKEN: r.correlationId,
      PG_TOKEN: r.token || null,
      CARD_NUMBER_MASKED: maskedNumber || null,
      CARD_BRAND: cardBrand || null,
      FIRST_SIX: firstSix || null,
      LAST_FOUR: lastFour || null,
      FUNDING_METHOD: r['sourceOfFunds.provided.card.fundingMethod'] || null,
      EXP_DATE: r['sourceOfFunds.provided.card.expiry'] || null,
      RESULT: r.result,
      ERROR_CAUSE: r['error.cause'] || null,
      ERROR_EXPLANATION: r['error.explanation'] || null,
      MIGRATION_STATUS: r.result === 'SUCCESS' ? 'PENDING' : 'FAILED',
    };
  });

  // Use parameterized INSERT instead of bulkInsert (BCP has issues with identity columns)
  for (const row of rows) {
    await executeQuery(
      `INSERT INTO PG_TOKENS_STAGING
        (FILE_ID, MONERIS_TOKEN, PG_TOKEN, CARD_NUMBER_MASKED, CARD_BRAND, FIRST_SIX, LAST_FOUR,
         FUNDING_METHOD, EXP_DATE, RESULT, ERROR_CAUSE, ERROR_EXPLANATION, MIGRATION_STATUS)
       VALUES
        (@fileId, @monerisToken, @pgToken, @cardNumberMasked, @cardBrand, @firstSix, @lastFour,
         @fundingMethod, @expDate, @result, @errorCause, @errorExplanation, @migrationStatus)`,
      {
        fileId: row.FILE_ID,
        monerisToken: row.MONERIS_TOKEN,
        pgToken: row.PG_TOKEN,
        cardNumberMasked: row.CARD_NUMBER_MASKED,
        cardBrand: row.CARD_BRAND,
        firstSix: row.FIRST_SIX,
        lastFour: row.LAST_FOUR,
        fundingMethod: row.FUNDING_METHOD,
        expDate: row.EXP_DATE,
        result: row.RESULT,
        errorCause: row.ERROR_CAUSE,
        errorExplanation: row.ERROR_EXPLANATION,
        migrationStatus: row.MIGRATION_STATUS,
      }
    );
  }

  logger.info(`Inserted ${rows.length} records to PG_TOKENS_STAGING`, { fileId });
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate deterministic mock response for testing
 * Uses token value to determine outcome (useful for predictable tests)
 */
export function generateDeterministicMockResponse(
  token: string,
  expDate: string | null
): MockMcResponse {
  // Use last digit to determine success/failure
  const lastDigit = parseInt(token.slice(-1), 10);
  const isSuccess = lastDigit < 8; // 80% success rate

  const pgToken = isSuccess ? `9${token.slice(1)}` : '';
  const cardDetails = generateMockCardDetails();

  if (isSuccess) {
    return {
      apiOperation: '',
      correlationId: token,
      'sourceOfFunds.type': 'CARD',
      'sourceOfFunds.provided.card.number': cardDetails.maskedNumber,
      'sourceOfFunds.provided.card.expiry.month': '',
      'sourceOfFunds.provided.card.expiry.year': '',
      result: 'SUCCESS',
      'error.cause': '',
      'error.explanation': '',
      'error.field': '',
      'error.supportCode': '',
      'error.validationType': '',
      token: pgToken,
      'schemeToken.status': 'PROVISIONING',
      'sourceOfFunds.provided.card.fundingMethod': cardDetails.fundingMethod,
      'sourceOfFunds.provided.card.expiry': expDate ?? '',
      'sourceOfFunds.provided.card.scheme': cardDetails.scheme,
    };
  } else {
    return {
      apiOperation: '',
      correlationId: token,
      'sourceOfFunds.type': 'CARD',
      'sourceOfFunds.provided.card.number': '',
      'sourceOfFunds.provided.card.expiry.month': '',
      'sourceOfFunds.provided.card.expiry.year': '',
      result: 'FAILURE',
      'error.cause': 'INVALID_CARD',
      'error.explanation': 'Card validation failed',
      'error.field': 'card.number',
      'error.supportCode': 'E001',
      'error.validationType': 'LUHN_CHECK',
      token: '',
      'schemeToken.status': '',
      'sourceOfFunds.provided.card.fundingMethod': '',
      'sourceOfFunds.provided.card.expiry': expDate ?? '',
      'sourceOfFunds.provided.card.scheme': '',
    };
  }
}
