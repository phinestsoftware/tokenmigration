import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobClient,
  BlobDownloadResponseParsed,
} from '@azure/storage-blob';
import { getConfig } from '../config/index.js';
import { Logger, createLogger } from '../utils/logger.js';

const logger: Logger = createLogger('BlobStorageService');

let blobServiceClient: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    const config = getConfig();
    blobServiceClient = BlobServiceClient.fromConnectionString(config.STORAGE_CONNECTION_STRING);
  }
  return blobServiceClient;
}

function getContainerClient(containerName: string): ContainerClient {
  return getBlobServiceClient().getContainerClient(containerName);
}

export interface BlobInfo {
  name: string;
  containerName: string;
  url: string;
  contentLength?: number;
  lastModified?: Date;
}

export async function uploadBlob(
  containerName: string,
  blobName: string,
  content: string | Buffer,
  contentType = 'text/csv'
): Promise<BlobInfo> {
  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const contentBuffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

  await blockBlobClient.upload(contentBuffer, contentBuffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  logger.info('Blob uploaded', { containerName, blobName, size: contentBuffer.length });

  return {
    name: blobName,
    containerName,
    url: blockBlobClient.url,
    contentLength: contentBuffer.length,
  };
}

export async function downloadBlob(containerName: string, blobName: string): Promise<string> {
  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const response: BlobDownloadResponseParsed = await blockBlobClient.download(0);

  if (!response.readableStreamBody) {
    throw new Error(`Failed to download blob: ${blobName}`);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of response.readableStreamBody) {
    chunks.push(Buffer.from(chunk));
  }

  const content = Buffer.concat(chunks).toString('utf-8');
  logger.info('Blob downloaded', { containerName, blobName, size: content.length });

  return content;
}

export async function downloadBlobToBuffer(
  containerName: string,
  blobName: string
): Promise<Buffer> {
  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const response = await blockBlobClient.download(0);

  if (!response.readableStreamBody) {
    throw new Error(`Failed to download blob: ${blobName}`);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of response.readableStreamBody) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export async function blobExists(containerName: string, blobName: string): Promise<boolean> {
  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  return blockBlobClient.exists();
}

export async function deleteBlob(containerName: string, blobName: string): Promise<void> {
  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.deleteIfExists();
  logger.info('Blob deleted', { containerName, blobName });
}

export async function listBlobs(
  containerName: string,
  prefix?: string
): Promise<BlobInfo[]> {
  const containerClient = getContainerClient(containerName);
  const blobs: BlobInfo[] = [];

  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    blobs.push({
      name: blob.name,
      containerName,
      url: `${containerClient.url}/${blob.name}`,
      contentLength: blob.properties.contentLength,
      lastModified: blob.properties.lastModified,
    });
  }

  return blobs;
}

export async function moveBlob(
  sourceContainer: string,
  sourceBlobName: string,
  destContainer: string,
  destBlobName: string
): Promise<BlobInfo> {
  // Download source
  const content = await downloadBlobToBuffer(sourceContainer, sourceBlobName);

  // Upload to destination
  const result = await uploadBlob(destContainer, destBlobName, content);

  // Delete source
  await deleteBlob(sourceContainer, sourceBlobName);

  logger.info('Blob moved', {
    from: `${sourceContainer}/${sourceBlobName}`,
    to: `${destContainer}/${destBlobName}`,
  });

  return result;
}

export async function copyBlob(
  sourceContainer: string,
  sourceBlobName: string,
  destContainer: string,
  destBlobName: string
): Promise<BlobInfo> {
  const sourceContainerClient = getContainerClient(sourceContainer);
  const sourceBlockBlobClient = sourceContainerClient.getBlockBlobClient(sourceBlobName);

  const destContainerClient = getContainerClient(destContainer);
  const destBlockBlobClient = destContainerClient.getBlockBlobClient(destBlobName);

  const copyPoller = await destBlockBlobClient.beginCopyFromURL(sourceBlockBlobClient.url);
  await copyPoller.pollUntilDone();

  logger.info('Blob copied', {
    from: `${sourceContainer}/${sourceBlobName}`,
    to: `${destContainer}/${destBlobName}`,
  });

  return {
    name: destBlobName,
    containerName: destContainer,
    url: destBlockBlobClient.url,
  };
}

// Helper to parse blob trigger path
export function parseBlobPath(blobPath: string): {
  container: string;
  folder: string;
  fileName: string;
} {
  const parts = blobPath.split('/');
  const container = parts[0] || '';
  const fileName = parts[parts.length - 1] || '';
  const folder = parts.slice(1, -1).join('/');

  return { container, folder, fileName };
}

// Helper to create blob client from trigger
export function getBlobClient(containerName: string, blobName: string): BlockBlobClient {
  return getContainerClient(containerName).getBlockBlobClient(blobName);
}
