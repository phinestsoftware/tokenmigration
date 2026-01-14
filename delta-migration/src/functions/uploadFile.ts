import { app, InvocationContext } from '@azure/functions';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { insertFileMetadata, insertMonerisTokens } from '../services/database';
import { sendToValidateQueue } from '../services/queueService';
import { mapInputToMonerisToken, MonerisTokenInput } from '../models/monerisToken';
import { FileMetadata } from '../models/migrationBatch';

/**
 * Blob trigger function for delta migration file upload
 * Triggered when files are uploaded to billing-input/{source}/{name}
 */
export async function uploadFileDelta(
  blob: Buffer,
  context: InvocationContext
): Promise<void> {
  const blobPath = context.triggerMetadata?.blobTrigger as string;
  const fileName = context.triggerMetadata?.name as string;

  context.log(`Delta Migration - Processing file: ${blobPath}`);

  // Extract source ID from path (e.g., billing-input/V21/filename.csv)
  const pathParts = blobPath.split('/');
  const sourceId = pathParts.length > 1 ? pathParts[1] : 'UNKNOWN';

  // Generate unique file ID
  const fileId = `DELTA_${sourceId}_${Date.now()}_${uuidv4().substring(0, 8)}`;

  try {
    // Parse CSV content
    const content = blob.toString('utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as MonerisTokenInput[];

    context.log(`Parsed ${records.length} records from file`);

    // Create file metadata
    const metadata: FileMetadata = {
      fileId,
      fileName,
      sourceId,
      fileType: 'DELTA',
      status: 'UPLOADED',
      totalRecords: records.length,
      validRecords: 0,
      invalidRecords: 0,
      uploadedAt: new Date(),
    };

    // Insert file metadata
    await insertFileMetadata(metadata);
    context.log(`File metadata created: ${fileId}`);

    // Map and insert tokens
    const tokens = records.map(record => mapInputToMonerisToken(record, fileId));
    await insertMonerisTokens(tokens);
    context.log(`Inserted ${tokens.length} tokens to staging`);

    // Queue validation
    await sendToValidateQueue({
      fileId,
      sourceId,
      fileName,
    });
    context.log(`Queued file ${fileId} for validation`);

  } catch (error) {
    context.error(`Error processing file ${fileName}:`, error);
    throw error;
  }
}

app.storageBlob('uploadFileDelta', {
  path: 'delta-input/{source}/{name}',
  connection: 'AzureWebJobsStorage',
  handler: uploadFileDelta,
});
