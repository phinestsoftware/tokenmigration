import { app, InvocationContext, HttpRequest, HttpResponseInit } from '@azure/functions';
import { stringify } from 'csv-stringify/sync';
import { getCompletedTokensForFile } from '../services/database';
import { uploadBillingOutput } from '../services/blobStorage';
import { GenerateOutputMessage } from '../services/queueService';

const OUTPUT_HEADERS = [
  'MONERIS_TOKEN',
  'EXP_DATE',
  'ENTITY_ID',
  'ENTITY_REF_TYPE',
  'PMR',
  'CARD_BRAND',
  'FIRST_SIX',
  'LAST_FOUR',
  'FUNDING_METHOD',
];

/**
 * Queue trigger function to generate billing output file
 * Creates CSV file with migrated tokens and uploads to billing-output container
 */
export async function generateBillingFileDelta(
  message: GenerateOutputMessage,
  context: InvocationContext
): Promise<void> {
  const { fileId, sourceId, fileName } = message;

  context.log(`Delta Migration - Generating output file for: ${fileId}`);

  try {
    // Get completed tokens
    const tokens = await getCompletedTokensForFile(fileId);

    context.log(`Found ${tokens.length} completed tokens for output`);

    if (tokens.length === 0) {
      context.log('No completed tokens to output');
      return;
    }

    // Generate output file name
    const inputFileName = fileName.replace('.csv', '').replace('.input', '');
    const outputFileName = `${inputFileName}.output.csv`;

    // Create CSV content
    const rows = tokens.map(token => ({
      MONERIS_TOKEN: token.MONERIS_TOKEN,
      EXP_DATE: token.EXP_DATE,
      ENTITY_ID: token.ENTITY_ID,
      ENTITY_REF_TYPE: token.ENTITY_TYPE,
      PMR: token.PMR,
      CARD_BRAND: token.CARD_BRAND,
      FIRST_SIX: token.FIRST_SIX,
      LAST_FOUR: token.LAST_FOUR,
      FUNDING_METHOD: token.FUNDING_METHOD,
    }));

    const csvContent = stringify(rows, {
      header: true,
      columns: OUTPUT_HEADERS,
    });

    // Add trailer line
    const trailer = `${String(tokens.length).padStart(10, '0')},${formatTimestamp(new Date())}`;
    const finalContent = csvContent + trailer + '\n';

    // Upload to blob storage
    const blobPath = await uploadBillingOutput(sourceId, outputFileName, finalContent);

    context.log(`Output file uploaded to: ${blobPath}`);

  } catch (error) {
    context.error(`Error generating output file for ${fileId}:`, error);
    throw error;
  }
}

/**
 * HTTP trigger for manual output file generation
 */
export async function generateBillingFileHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const fileId = request.query.get('fileId');
  const sourceId = request.query.get('sourceId') || 'V21';

  if (!fileId) {
    return {
      status: 400,
      body: JSON.stringify({ error: 'fileId query parameter is required' }),
    };
  }

  context.log(`HTTP trigger - Generating output for fileId: ${fileId}`);

  try {
    const tokens = await getCompletedTokensForFile(fileId);

    if (tokens.length === 0) {
      return {
        status: 404,
        body: JSON.stringify({ error: 'No completed tokens found for this file' }),
      };
    }

    // Create CSV content
    const rows = tokens.map(token => ({
      MONERIS_TOKEN: token.MONERIS_TOKEN,
      EXP_DATE: token.EXP_DATE,
      ENTITY_ID: token.ENTITY_ID,
      ENTITY_REF_TYPE: token.ENTITY_TYPE,
      PMR: token.PMR,
      CARD_BRAND: token.CARD_BRAND,
      FIRST_SIX: token.FIRST_SIX,
      LAST_FOUR: token.LAST_FOUR,
      FUNDING_METHOD: token.FUNDING_METHOD,
    }));

    const csvContent = stringify(rows, {
      header: true,
      columns: OUTPUT_HEADERS,
    });

    const trailer = `${String(tokens.length).padStart(10, '0')},${formatTimestamp(new Date())}`;
    const finalContent = csvContent + trailer + '\n';

    // Upload to blob storage
    const outputFileName = `${fileId}.output.csv`;
    const blobPath = await uploadBillingOutput(sourceId, outputFileName, finalContent);

    return {
      status: 200,
      body: JSON.stringify({
        success: true,
        fileId,
        recordCount: tokens.length,
        outputPath: blobPath,
      }),
    };

  } catch (error) {
    context.error('Error generating output file:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to generate output file' }),
    };
  }
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

app.storageQueue('generateBillingFileDelta', {
  queueName: 'delta-generate-output',
  connection: 'AzureWebJobsStorage',
  handler: generateBillingFileDelta,
});

app.http('generateBillingFileHttp', {
  methods: ['GET', 'POST'],
  route: 'delta/billing/generate',
  handler: generateBillingFileHttp,
});
