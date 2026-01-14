import { z } from 'zod';

const configSchema = z.object({
  // Database Configuration
  SQL_SERVER: z.string().min(1),
  SQL_DATABASE: z.string().min(1),
  SQL_USER: z.string().min(1),
  SQL_PASSWORD: z.string().min(1),
  SQL_ENCRYPT: z.string().transform(v => v === 'true').default('true'),
  SQL_TRUST_SERVER_CERTIFICATE: z.string().transform(v => v === 'true').default('false'),

  // Storage Configuration
  STORAGE_CONNECTION_STRING: z.string().optional(),

  // Batch Configuration
  DEFAULT_BATCH_SIZE: z.string().transform(Number).default('500'),
  FAILURE_THRESHOLD_PERCENT: z.string().transform(Number).default('50'),

  // PG Tokenization Service Configuration
  PG_TOKENIZATION_URL: z.string().url(),
  DEFAULT_MERCHANT_ID: z.string().default('SBX_ROGERS'),

  // Email Configuration
  EMAIL_CONNECTION_STRING: z.string().optional(),
  EMAIL_SENDER_ADDRESS: z.string().email().optional(),
  EMAIL_NOTIFICATION_RECIPIENTS: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Configuration validation failed: ${errors}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function getDatabaseConfig() {
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
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}
