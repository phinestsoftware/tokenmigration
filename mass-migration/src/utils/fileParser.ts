import { parse } from 'csv-parse/sync';
import { parse as parseAsync } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import { Readable, Transform } from 'stream';
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
 * Streaming CSV validation result
 */
export interface StreamValidationResult {
  isValid: boolean;
  errors: string[];
  header: string[] | null;
}

/**
 * Validate header from buffer (streaming-compatible)
 * Only reads the first line to validate column structure
 */
export function validateHeaderFromBuffer(
  buffer: Buffer,
  expectedColumns: readonly string[]
): StreamValidationResult {
  const errors: string[] = [];

  // Find the first newline to get just the header
  const newlineIndex = buffer.indexOf('\n');
  if (newlineIndex === -1 && buffer.length === 0) {
    errors.push('File is empty');
    return { isValid: false, errors, header: null };
  }

  // Get header line (handle both \r\n and \n)
  const headerEndIndex = newlineIndex === -1 ? buffer.length : newlineIndex;
  let headerLine = buffer.subarray(0, headerEndIndex).toString('utf-8').trim();

  // Remove BOM if present
  if (headerLine.charCodeAt(0) === 0xFEFF) {
    headerLine = headerLine.substring(1);
  }

  const headerColumns = headerLine.split(',').map((col) => col.trim());

  // Check for missing columns
  for (const expected of expectedColumns) {
    if (!headerColumns.includes(expected)) {
      errors.push(`Missing required column: ${expected}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    header: headerColumns,
  };
}

/**
 * Streaming CSV parser options
 */
export interface StreamParseOptions {
  batchSize?: number;
  delimiter?: string;
  trimFields?: boolean;
  onBatch: (records: Record<string, string>[], batchNumber: number) => Promise<void>;
  onProgress?: (processedRows: number) => void;
}

/**
 * Streaming CSV parser result
 */
export interface StreamParseResult {
  totalRecords: number;
  trailer: string | null;
  batchesProcessed: number;
}

/**
 * Parse CSV content in streaming mode
 * Processes records in batches to avoid memory issues with large files
 *
 * @param buffer - The file buffer to parse
 * @param options - Streaming parse options including batch callback
 * @returns Promise with total records and trailer info
 */
export async function parseCSVStream(
  buffer: Buffer,
  options: StreamParseOptions
): Promise<StreamParseResult> {
  const {
    batchSize = 5000,
    delimiter = ',',
    trimFields = true,
    onBatch,
    onProgress,
  } = options;

  return new Promise((resolve, reject) => {
    let totalRecords = 0;
    let batchNumber = 0;
    let currentBatch: Record<string, string>[] = [];
    let lastRecord: Record<string, string> | null = null;
    let trailer: string | null = null;

    // Queue for sequential batch processing
    const batchQueue: Array<{ records: Record<string, string>[]; batchNum: number }> = [];
    let isProcessingQueue = false;
    let parserEnded = false;
    let resolvePromise: (() => void) | null = null;
    let rejectPromise: ((error: Error) => void) | null = null;

    // Create readable stream from buffer
    const readable = Readable.from(buffer);

    // Create async parser
    const parser = parseAsync({
      columns: true, // First line is header
      skip_empty_lines: true,
      trim: trimFields,
      delimiter,
      relax_column_count: true,
      relax_quotes: true,
      // Don't cast values - keep as strings
      cast: false,
    });

    // Process batches from queue sequentially
    const processQueue = async (): Promise<void> => {
      if (isProcessingQueue) return;
      isProcessingQueue = true;

      try {
        while (batchQueue.length > 0) {
          const batch = batchQueue.shift();
          if (batch && batch.records.length > 0) {
            await onBatch(batch.records, batch.batchNum);
            if (onProgress) {
              onProgress(totalRecords);
            }
          }
        }

        // If parser has ended and queue is empty, resolve
        if (parserEnded && batchQueue.length === 0 && resolvePromise) {
          logger.info('Streaming CSV parsing completed', {
            totalRecords,
            batchesProcessed: batchNumber,
            hasTrailer: trailer !== null,
          });

          resolvePromise();
        }
      } catch (error) {
        if (rejectPromise) {
          rejectPromise(error instanceof Error ? error : new Error(String(error)));
        }
        parser.destroy(error instanceof Error ? error : new Error(String(error)));
      } finally {
        isProcessingQueue = false;
      }
    };

    // Queue a batch for processing
    const queueBatch = (records: Record<string, string>[], batchNum: number): void => {
      if (records.length > 0) {
        batchQueue.push({ records: [...records], batchNum });
        // Start processing queue (non-blocking)
        processQueue().catch((err) => {
          if (rejectPromise) {
            rejectPromise(err instanceof Error ? err : new Error(String(err)));
          }
        });
      }
    };

    // Handle each record
    parser.on('data', (record: Record<string, string>) => {
      // Keep track of last record for trailer detection
      lastRecord = record;
      currentBatch.push(record);
      totalRecords++;

      // Process batch when it reaches batch size
      if (currentBatch.length >= batchSize) {
        batchNumber++;
        queueBatch(currentBatch, batchNumber);
        currentBatch = [];
      }
    });

    parser.on('end', async () => {
      try {
        // Check if last record is a trailer
        // Trailer format: has fewer columns or matches trailer pattern
        if (lastRecord && currentBatch.length > 0) {
          const lastInBatch = currentBatch[currentBatch.length - 1];
          const values = Object.values(lastInBatch);
          const nonEmptyValues = values.filter(v => v && v.trim() !== '');

          // Trailer detection: if most values are empty or it looks like trailer format
          if (nonEmptyValues.length <= 2 ||
              (values[0] && /^\d{10},?\d{14}$/.test(values.join('')))) {
            // Remove trailer from batch
            const trailerRecord = currentBatch.pop();
            if (trailerRecord) {
              trailer = Object.values(trailerRecord).filter(v => v).join(',');
              totalRecords--;
            }
          }
        }

        // Queue remaining records
        if (currentBatch.length > 0) {
          batchNumber++;
          queueBatch(currentBatch, batchNumber);
        }

        // Mark parser as ended
        parserEnded = true;

        // Create promise to wait for queue to finish
        await new Promise<void>((res, rej) => {
          resolvePromise = res;
          rejectPromise = rej;

          // If queue is empty, resolve immediately
          if (batchQueue.length === 0 && !isProcessingQueue) {
            logger.info('Streaming CSV parsing completed', {
              totalRecords,
              batchesProcessed: batchNumber,
              hasTrailer: trailer !== null,
            });
            res();
          } else {
            // Otherwise, processQueue will resolve when done
            processQueue().catch(rej);
          }
        });

        resolve({
          totalRecords,
          trailer,
          batchesProcessed: batchNumber,
        });
      } catch (error) {
        reject(error);
      }
    });

    parser.on('error', (error) => {
      logger.error('Streaming CSV parser error', error);
      reject(error);
    });

    // Pipe buffer to parser
    readable.pipe(parser);
  });
}

/**
 * Parse CSV from a readable stream (for large files)
 * This is the most memory-efficient approach - processes data as it streams
 * without ever loading the entire file into memory
 *
 * @param stream - Node.js readable stream from blob storage
 * @param options - Streaming parse options including batch callback
 * @returns Promise with total records and trailer info
 */
export async function parseCSVFromStream(
  stream: NodeJS.ReadableStream,
  options: StreamParseOptions
): Promise<StreamParseResult> {
  const {
    batchSize = 5000,
    delimiter = ',',
    trimFields = true,
    onBatch,
    onProgress,
  } = options;

  return new Promise((resolve, reject) => {
    let totalRecords = 0;
    let batchNumber = 0;
    let currentBatch: Record<string, string>[] = [];
    let lastRecord: Record<string, string> | null = null;
    let trailer: string | null = null;

    // Queue for sequential batch processing
    const batchQueue: Array<{ records: Record<string, string>[]; batchNum: number }> = [];
    let isProcessingQueue = false;
    let parserEnded = false;
    let resolvePromise: (() => void) | null = null;
    let rejectPromise: ((error: Error) => void) | null = null;

    // Create async parser
    const parser = parseAsync({
      columns: true,
      skip_empty_lines: true,
      trim: trimFields,
      delimiter,
      relax_column_count: true,
      relax_quotes: true,
      cast: false,
      // BOM handling
      bom: true,
    });

    // Process batches from queue sequentially
    const processQueue = async (): Promise<void> => {
      if (isProcessingQueue) return;
      isProcessingQueue = true;

      try {
        while (batchQueue.length > 0) {
          const batch = batchQueue.shift();
          if (batch && batch.records.length > 0) {
            await onBatch(batch.records, batch.batchNum);
            if (onProgress) {
              onProgress(totalRecords);
            }
          }
        }

        if (parserEnded && batchQueue.length === 0 && resolvePromise) {
          logger.info('Stream CSV parsing completed', {
            totalRecords,
            batchesProcessed: batchNumber,
            hasTrailer: trailer !== null,
          });
          resolvePromise();
        }
      } catch (error) {
        if (rejectPromise) {
          rejectPromise(error instanceof Error ? error : new Error(String(error)));
        }
        parser.destroy(error instanceof Error ? error : new Error(String(error)));
      } finally {
        isProcessingQueue = false;
      }
    };

    const queueBatch = (records: Record<string, string>[], batchNum: number): void => {
      if (records.length > 0) {
        batchQueue.push({ records: [...records], batchNum });
        processQueue().catch((err) => {
          if (rejectPromise) {
            rejectPromise(err instanceof Error ? err : new Error(String(err)));
          }
        });
      }
    };

    parser.on('data', (record: Record<string, string>) => {
      lastRecord = record;
      currentBatch.push(record);
      totalRecords++;

      if (currentBatch.length >= batchSize) {
        batchNumber++;
        queueBatch(currentBatch, batchNumber);
        currentBatch = [];
      }
    });

    parser.on('end', async () => {
      try {
        // Trailer detection
        if (lastRecord && currentBatch.length > 0) {
          const lastInBatch = currentBatch[currentBatch.length - 1];
          const values = Object.values(lastInBatch);
          const nonEmptyValues = values.filter(v => v && v.trim() !== '');

          if (nonEmptyValues.length <= 2 ||
              (values[0] && /^\d{10},?\d{14}$/.test(values.join('')))) {
            const trailerRecord = currentBatch.pop();
            if (trailerRecord) {
              trailer = Object.values(trailerRecord).filter(v => v).join(',');
              totalRecords--;
            }
          }
        }

        if (currentBatch.length > 0) {
          batchNumber++;
          queueBatch(currentBatch, batchNumber);
        }

        parserEnded = true;

        await new Promise<void>((res, rej) => {
          resolvePromise = res;
          rejectPromise = rej;

          if (batchQueue.length === 0 && !isProcessingQueue) {
            logger.info('Stream CSV parsing completed', {
              totalRecords,
              batchesProcessed: batchNumber,
              hasTrailer: trailer !== null,
            });
            res();
          } else {
            processQueue().catch(rej);
          }
        });

        resolve({
          totalRecords,
          trailer,
          batchesProcessed: batchNumber,
        });
      } catch (error) {
        reject(error);
      }
    });

    parser.on('error', (error) => {
      logger.error('Stream CSV parser error', error);
      reject(error);
    });

    // Pipe the input stream directly to the parser
    stream.pipe(parser);
  });
}

/**
 * Validate CSV header from a stream by reading just the first chunk
 * Returns the header columns and a new stream that includes the header
 */
export async function validateHeaderFromStream(
  stream: NodeJS.ReadableStream,
  expectedColumns: readonly string[]
): Promise<StreamValidationResult & { stream: NodeJS.ReadableStream }> {
  return new Promise((resolve, reject) => {
    const errors: string[] = [];
    let headerLine = '';
    let headerFound = false;
    const chunks: Buffer[] = [];

    const onData = (chunk: Buffer) => {
      chunks.push(chunk);

      if (!headerFound) {
        const str = Buffer.concat(chunks).toString('utf-8');
        const newlineIndex = str.indexOf('\n');

        if (newlineIndex !== -1) {
          headerFound = true;
          headerLine = str.substring(0, newlineIndex).trim();

          // Remove BOM if present
          if (headerLine.charCodeAt(0) === 0xFEFF) {
            headerLine = headerLine.substring(1);
          }

          // Remove listener - we have what we need
          stream.removeListener('data', onData);

          const headerColumns = headerLine.split(',').map((col) => col.trim());

          // Check for missing columns
          for (const expected of expectedColumns) {
            if (!headerColumns.includes(expected)) {
              errors.push(`Missing required column: ${expected}`);
            }
          }

          // Create a new stream that replays the buffered data
          const bufferedData = Buffer.concat(chunks);
          const replayStream = new Readable({
            read() {
              this.push(bufferedData);
              // Continue piping the original stream
              stream.on('data', (chunk) => this.push(chunk));
              stream.on('end', () => this.push(null));
              stream.on('error', (err) => this.destroy(err));
            }
          });

          resolve({
            isValid: errors.length === 0,
            errors,
            header: headerColumns,
            stream: replayStream,
          });
        }
      }
    };

    stream.on('data', onData);

    stream.on('error', (error) => {
      reject(error);
    });

    stream.on('end', () => {
      if (!headerFound) {
        errors.push('File is empty or has no header');
        resolve({
          isValid: false,
          errors,
          header: null,
          stream: Readable.from([]),
        });
      }
    });
  });
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
