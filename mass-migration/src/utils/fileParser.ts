import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { Logger, createLogger } from './logger.js';

const logger: Logger = createLogger('FileParser');

export interface ParseOptions {
  hasHeader?: boolean;
  delimiter?: string;
  skipEmptyLines?: boolean;
  trimFields?: boolean;
}

export interface ParseResult<T> {
  records: T[];
  header: string[] | null;
  trailer: string | null;
  totalLines: number;
}

/**
 * Parse CSV content to array of objects
 */
export function parseCsv<T>(
  content: string,
  options: ParseOptions = {}
): ParseResult<T> {
  const {
    hasHeader = true,
    delimiter = ',',
    skipEmptyLines = true,
    trimFields = true,
  } = options;

  const lines = content.split('\n').filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return { records: [], header: null, trailer: null, totalLines: 0 };
  }

  // Check for trailer (last line with different format)
  let trailer: string | null = null;
  let dataLines = lines;

  // Trailer detection: if last line has different number of columns or starts with digit
  const lastLine = lines[lines.length - 1];
  const headerColumnCount = hasHeader ? lines[0].split(delimiter).length : 0;
  const lastLineColumnCount = lastLine.split(delimiter).length;

  if (
    lastLineColumnCount !== headerColumnCount ||
    /^\d{10},\d{14}/.test(lastLine.trim())
  ) {
    trailer = lastLine.trim();
    dataLines = lines.slice(0, -1);
  }

  // Parse CSV
  const parseOptions = {
    columns: hasHeader,
    skip_empty_lines: skipEmptyLines,
    trim: trimFields,
    delimiter,
    relax_column_count: true,
  };

  try {
    const records = parse(dataLines.join('\n'), parseOptions) as T[];

    logger.info('CSV parsed successfully', {
      totalLines: lines.length,
      dataRecords: records.length,
      hasTrailer: trailer !== null,
    });

    return {
      records,
      header: hasHeader ? dataLines[0].split(delimiter) : null,
      trailer,
      totalLines: lines.length,
    };
  } catch (error) {
    logger.error('Failed to parse CSV', error);
    throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate CSV content from array of objects
 */
export function generateCsv<T extends Record<string, unknown>>(
  records: T[],
  columns: string[],
  options: {
    includeHeader?: boolean;
    delimiter?: string;
    trailer?: string;
  } = {}
): string {
  const { includeHeader = true, delimiter = ',', trailer } = options;

  if (records.length === 0 && !includeHeader) {
    return trailer ?? '';
  }

  const csvOptions = {
    header: includeHeader,
    columns: columns.map((col) => ({
      key: col,
      header: col,
    })),
    delimiter,
  };

  try {
    let content = stringify(records, csvOptions);

    if (trailer) {
      content += `\n${trailer}`;
    }

    logger.info('CSV generated successfully', {
      recordCount: records.length,
      hasTrailer: !!trailer,
    });

    return content;
  } catch (error) {
    logger.error('Failed to generate CSV', error);
    throw new Error(`CSV generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate trailer line
 */
export function generateTrailer(
  transactionCount: number,
  options?: {
    businessUnit?: string;
    sourceId?: string;
  }
): string {
  const timestamp = formatTimestamp(new Date());
  const countStr = String(transactionCount).padStart(10, '0');

  if (options?.businessUnit || options?.sourceId) {
    return `BU=${options.businessUnit ?? ''},SOURCE_ID=${options.sourceId ?? ''},TRANSACTION_COUNT=${countStr},TIMESTAMP=${timestamp}`;
  }

  return `${countStr},${timestamp}`;
}

/**
 * Format date as YYYYMMDDHH24MISS
 */
export function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Validate file structure
 */
export function validateFileStructure(
  content: string,
  expectedColumns: readonly string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const lines = content.split('\n').filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    errors.push('File is empty');
    return { isValid: false, errors };
  }

  // Check header
  const headerLine = lines[0];
  const headerColumns = headerLine.split(',').map((col) => col.trim());

  // Check for missing columns
  for (const expected of expectedColumns) {
    if (!headerColumns.includes(expected)) {
      errors.push(`Missing required column: ${expected}`);
    }
  }

  // Check for minimum data rows
  if (lines.length < 2) {
    errors.push('File has no data rows');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Split content into chunks for batch processing
 */
export function splitIntoChunks<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Parse Mastercard input file format
 * Header: MONERIS_TOKEN,EXP_DATE_MM,EXP_DATE_YY
 * Trailer: BU=WL,SOURCE_ID=V21,TRANSACTION_COUNT=0000000010,TIMESTAMP=20251208141500
 */
export interface McInputRecord {
  monerisToken: string;
  expDateMm: string;
  expDateYy: string;
}

export function generateMcInputFile(
  tokens: Array<{ monerisToken: string; expDate: string | null }>,
  sourceId: string,
  businessUnit: string = 'WL'
): string {
  const header = 'MONERIS_TOKEN,EXP_DATE_MM,EXP_DATE_YY';

  const dataRows = tokens.map((token) => {
    const expMm = token.expDate?.substring(0, 2) ?? '';
    const expYy = token.expDate?.substring(2, 4) ?? '';
    return `${token.monerisToken},${expMm},${expYy}`;
  });

  const trailer = generateTrailer(tokens.length, { businessUnit, sourceId });

  return [header, ...dataRows, trailer].join('\n');
}
