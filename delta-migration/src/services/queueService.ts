import { QueueClient, QueueServiceClient } from '@azure/storage-queue';

// Queue names
export const QUEUES = {
  VALIDATE_TOKENS: 'delta-validate-tokens',
  CREATE_BATCH: 'delta-create-batch',
  BATCH_WORKER: 'delta-batch-worker',
  GENERATE_OUTPUT: 'delta-generate-output',
};

let queueServiceClient: QueueServiceClient | null = null;

function getQueueServiceClient(): QueueServiceClient {
  if (!queueServiceClient) {
    const connectionString = process.env.AzureWebJobsStorage || process.env.STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Storage connection string not configured');
    }
    queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
  }
  return queueServiceClient;
}

async function getQueueClient(queueName: string): Promise<QueueClient> {
  const serviceClient = getQueueServiceClient();
  const queueClient = serviceClient.getQueueClient(queueName);
  await queueClient.createIfNotExists();
  return queueClient;
}

export interface ValidateTokensMessage {
  fileId: string;
  sourceId: string;
  fileName: string;
}

export interface CreateBatchMessage {
  fileId: string;
  sourceId: string;
}

export interface BatchWorkerMessage {
  batchId: string;
  fileId: string;
  sourceId: string;
  tokenIds: number[];
}

export interface GenerateOutputMessage {
  fileId: string;
  sourceId: string;
  fileName: string;
}

export async function sendToValidateQueue(message: ValidateTokensMessage): Promise<void> {
  const queueClient = await getQueueClient(QUEUES.VALIDATE_TOKENS);
  const encodedMessage = Buffer.from(JSON.stringify(message)).toString('base64');
  await queueClient.sendMessage(encodedMessage);
}

export async function sendToCreateBatchQueue(message: CreateBatchMessage): Promise<void> {
  const queueClient = await getQueueClient(QUEUES.CREATE_BATCH);
  const encodedMessage = Buffer.from(JSON.stringify(message)).toString('base64');
  await queueClient.sendMessage(encodedMessage);
}

export async function sendToBatchWorkerQueue(message: BatchWorkerMessage): Promise<void> {
  const queueClient = await getQueueClient(QUEUES.BATCH_WORKER);
  const encodedMessage = Buffer.from(JSON.stringify(message)).toString('base64');
  await queueClient.sendMessage(encodedMessage);
}

export async function sendToGenerateOutputQueue(message: GenerateOutputMessage): Promise<void> {
  const queueClient = await getQueueClient(QUEUES.GENERATE_OUTPUT);
  const encodedMessage = Buffer.from(JSON.stringify(message)).toString('base64');
  await queueClient.sendMessage(encodedMessage);
}
