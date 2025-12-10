import { QueueClient, QueueServiceClient } from '@azure/storage-queue';
import { getConfig } from '../config/index.js';
import { Logger, createLogger } from '../utils/logger.js';

const logger: Logger = createLogger('QueueService');

let queueServiceClient: QueueServiceClient | null = null;
const queueClients: Map<string, QueueClient> = new Map();

function getQueueServiceClient(): QueueServiceClient {
  if (!queueServiceClient) {
    const config = getConfig();
    queueServiceClient = QueueServiceClient.fromConnectionString(config.STORAGE_CONNECTION_STRING);
  }
  return queueServiceClient;
}

function getQueueClient(queueName: string): QueueClient {
  if (!queueClients.has(queueName)) {
    const client = getQueueServiceClient().getQueueClient(queueName);
    queueClients.set(queueName, client);
  }
  return queueClients.get(queueName)!;
}

export interface QueueMessage<T = unknown> {
  messageId: string;
  messageText: T;
  dequeueCount: number;
  insertedOn?: Date;
  expiresOn?: Date;
}

// Message types for each queue
export interface ValidateTokensMessage {
  fileId: string;
  context: 'MONERIS' | 'PG';
  sourceId: string;
  fileName: string;
}

export interface CreateBatchMessage {
  fileId: string;
  sourceId: string;
}

export interface FileGenMessage {
  fileId: string;
  sourceId: string;
  tokenCount: number;
}

export interface BatchManagerMessage {
  fileId: string;
  sourceId: string;
  totalBatches: number;
}

export interface BatchWorkerMessage {
  batchId: string;
  fileId: string;
  sourceId: string;
  batchNumber: number;
  migrationType: 'MASS' | 'DELTA';
}

export interface BillingFileMessage {
  sourceId: string;
  fileId?: string;
  startDate?: string;
  endDate?: string;
}

export async function sendMessage<T>(queueName: string, message: T): Promise<string> {
  const queueClient = getQueueClient(queueName);

  // Ensure queue exists
  await queueClient.createIfNotExists();

  // Encode message as base64 (required for Azure Queue)
  const messageText = Buffer.from(JSON.stringify(message)).toString('base64');

  const response = await queueClient.sendMessage(messageText);

  logger.info('Message sent to queue', {
    queueName,
    messageId: response.messageId,
  });

  return response.messageId;
}

export async function sendMessageWithDelay<T>(
  queueName: string,
  message: T,
  delaySeconds: number
): Promise<string> {
  const queueClient = getQueueClient(queueName);
  await queueClient.createIfNotExists();

  const messageText = Buffer.from(JSON.stringify(message)).toString('base64');

  const response = await queueClient.sendMessage(messageText, {
    visibilityTimeout: delaySeconds,
  });

  logger.info('Delayed message sent to queue', {
    queueName,
    messageId: response.messageId,
    delaySeconds,
  });

  return response.messageId;
}

export function decodeQueueMessage<T>(messageText: string): T {
  const decoded = Buffer.from(messageText, 'base64').toString('utf-8');
  return JSON.parse(decoded) as T;
}

export async function getQueueLength(queueName: string): Promise<number> {
  const queueClient = getQueueClient(queueName);
  const properties = await queueClient.getProperties();
  return properties.approximateMessagesCount ?? 0;
}

export async function clearQueue(queueName: string): Promise<void> {
  const queueClient = getQueueClient(queueName);
  await queueClient.clearMessages();
  logger.info('Queue cleared', { queueName });
}

// Queue name getters using config
export function getQueueNames(): {
  validateTokens: string;
  createBatch: string;
  fileGen: string;
  batchManager: string;
  batchWorker: string;
  billingFile: string;
} {
  const config = getConfig();
  return {
    validateTokens: config.VALIDATE_QUEUE,
    createBatch: config.CREATE_BATCH_QUEUE,
    fileGen: config.FILE_GEN_QUEUE,
    batchManager: config.BATCH_MANAGER_QUEUE,
    batchWorker: config.BATCH_WORKER_QUEUE,
    billingFile: config.BILLING_FILE_QUEUE,
  };
}

// Convenience methods for each queue
export async function queueValidateTokens(message: ValidateTokensMessage): Promise<string> {
  return sendMessage(getQueueNames().validateTokens, message);
}

export async function queueCreateBatch(message: CreateBatchMessage): Promise<string> {
  return sendMessage(getQueueNames().createBatch, message);
}

export async function queueFileGen(message: FileGenMessage): Promise<string> {
  return sendMessage(getQueueNames().fileGen, message);
}

export async function queueBatchManager(message: BatchManagerMessage): Promise<string> {
  return sendMessage(getQueueNames().batchManager, message);
}

export async function queueBatchWorker(message: BatchWorkerMessage): Promise<string> {
  return sendMessage(getQueueNames().batchWorker, message);
}

export async function queueBillingFile(message: BillingFileMessage): Promise<string> {
  return sendMessage(getQueueNames().billingFile, message);
}
