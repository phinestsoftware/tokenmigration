import { BlobServiceClient } from '@azure/storage-blob';

const BILLING_INPUT_CONTAINER = 'billing-input';
const BILLING_OUTPUT_CONTAINER = 'billing-output';
const BACKUP_CONTAINER = 'backup';

let blobServiceClient: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    const connectionString = process.env.AzureWebJobsStorage || process.env.STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Storage connection string not configured');
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

export async function readBlobContent(containerName: string, blobPath: string): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobPath);

  const downloadResponse = await blobClient.download();
  const downloaded = await streamToString(downloadResponse.readableStreamBody!);
  return downloaded;
}

export async function uploadBlobContent(containerName: string, blobPath: string, content: string): Promise<void> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);

  // Create container if not exists
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
  await blockBlobClient.upload(content, content.length, {
    blobHTTPHeaders: { blobContentType: 'text/csv' },
  });
}

export async function moveBlobToBackup(sourcePath: string): Promise<void> {
  const client = getBlobServiceClient();
  const sourceContainer = client.getContainerClient(BILLING_INPUT_CONTAINER);
  const backupContainer = client.getContainerClient(BACKUP_CONTAINER);

  await backupContainer.createIfNotExists();

  const sourceBlobClient = sourceContainer.getBlobClient(sourcePath);
  const destBlobClient = backupContainer.getBlobClient(`${new Date().toISOString().split('T')[0]}/${sourcePath}`);

  // Copy to backup
  await destBlobClient.beginCopyFromURL(sourceBlobClient.url);

  // Delete from source
  await sourceBlobClient.delete();
}

export async function uploadBillingOutput(sourceId: string, fileName: string, content: string): Promise<string> {
  const blobPath = `${sourceId}/${fileName}`;
  await uploadBlobContent(BILLING_OUTPUT_CONTAINER, blobPath, content);
  return blobPath;
}

async function streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    readableStream.on('error', reject);
  });
}
