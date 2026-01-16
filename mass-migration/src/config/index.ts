import { z } from 'zod';

const envSchema = z.object({
  // SQL Database
  SQL_SERVER: z.string().min(1),
  SQL_DATABASE: z.string().min(1),
  SQL_USER: z.string().min(1),
  SQL_PASSWORD: z.string().min(1),
  SQL_ENCRYPT: z.string().transform((val) => val === 'true').default('true'),
  SQL_TRUST_SERVER_CERTIFICATE: z.string().transform((val) => val === 'true').default('false'),

  // Storage
  STORAGE_CONNECTION_STRING: z.string().min(1),
  STORAGE_ACCOUNT_NAME: z.string().optional(),

  // Blob Containers
  BILLING_INPUT_CONTAINER: z.string().default('billing-input'),
  BILLING_OUTPUT_CONTAINER: z.string().default('billing-output'),
  MASTERCARD_INPUT_CONTAINER: z.string().default('mastercard-input'),
  MASTERCARD_MAPPING_CONTAINER: z.string().default('mastercard-mapping'),

  // Queues
  VALIDATE_QUEUE: z.string().default('validate-tokens-queue'),
  CREATE_BATCH_QUEUE: z.string().default('create-batch-queue'),
  FILE_GEN_QUEUE: z.string().default('file-gen-queue'),
  BATCH_MANAGER_QUEUE: z.string().default('batch-manager-queue'),
  BATCH_WORKER_QUEUE: z.string().default('batch-worker-queue'),
  BILLING_FILE_QUEUE: z.string().default('billing-file-queue'),

  // Migration Settings
  DEFAULT_BATCH_SIZE: z.string().transform(Number).default('1000'),
  FAILURE_THRESHOLD_PERCENT: z.string().transform(Number).default('50'),
  MAX_ACTIVE_WORKERS: z.string().transform(Number).default('10'),

  // Email
  EMAIL_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  EMAIL_FROM: z.string().optional(),
  EMAIL_TO: z.string().optional(),
  ACS_CONNECTION_STRING: z.string().optional(),

  // Mock Services
  MOCK_MASTERCARD_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  MOCK_MASTERCARD_DELAY_MS: z.string().transform(Number).default('1000'),

  // Dynatrace OpenTelemetry Integration
  DYNATRACE_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  DT_API_URL: z.string().optional(), // e.g., https://{your-environment-id}.live.dynatrace.com/api/v2/otlp
  DT_API_TOKEN: z.string().optional(), // OpenTelemetry ingest token
  DT_SERVICE_NAME: z.string().default('mass-migration'),
  DT_SERVICE_VERSION: z.string().default('1.0.0'),
});

export type Config = z.infer<typeof envSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function getSqlConfig(): {
  server: string;
  database: string;
  user: string;
  password: string;
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
  };
} {
  const config = getConfig();
  return {
    server: config.SQL_SERVER,
    database: config.SQL_DATABASE,
    user: config.SQL_USER,
    password: config.SQL_PASSWORD,
    options: {
      encrypt: config.SQL_ENCRYPT,
      trustServerCertificate: config.SQL_TRUST_SERVER_CERTIFICATE,
    },
  };
}

export const SourceIds = {
  V21: 'V21',
  WINM: 'WINM',
  TSC: 'TSC',
} as const;

export type SourceId = (typeof SourceIds)[keyof typeof SourceIds];

export const TokenTypes = {
  PAYMENT: 'P',
  TRANSACTIONAL: 'T',
  ID: 'I',
} as const;

export type TokenType = (typeof TokenTypes)[keyof typeof TokenTypes];

export const MigrationTypes = {
  MASS: 'MASS',
  DELTA: 'DELTA',
} as const;

export type MigrationType = (typeof MigrationTypes)[keyof typeof MigrationTypes];

export const ValidationStatus = {
  PENDING: 'PENDING',
  VALID: 'VALID',
  INVALID: 'INVALID',
  DUPLICATE: 'DUPLICATE',
} as const;

export type ValidationStatusType = (typeof ValidationStatus)[keyof typeof ValidationStatus];

export const MigrationStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type MigrationStatusType = (typeof MigrationStatus)[keyof typeof MigrationStatus];

export const BatchStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type BatchStatusType = (typeof BatchStatus)[keyof typeof BatchStatus];

export const EntityTypes = {
  ACCOUNT: '1',
  GUID: '2',
} as const;

export const EntityStatuses = {
  OPEN: 'O',
  SUSPENDED: 'S',
  CANCELLED: 'N',
  CLOSED: 'C',
} as const;

export const CardBrands = {
  VISA: 'V',
  MASTERCARD: 'M',
  AMEX: 'A',
} as const;

export const FundingMethods = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
  CHARGE: 'CHARGE',
  UNKNOWN: 'UNKNOWN',
} as const;
