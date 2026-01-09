import { EmailClient } from '@azure/communication-email';
import { getConfig } from '../config/index.js';
import { Logger, createLogger } from '../utils/logger.js';

const logger: Logger = createLogger('EmailService');

/**
 * Get email recipients as an array (handles comma-separated string from config)
 */
function getEmailRecipients(): string[] {
  const config = getConfig();
  const emailTo = config.EMAIL_TO ?? '';
  return emailTo.split(',').map((e) => e.trim()).filter((e) => e.length > 0);
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}

export interface MigrationEmailData {
  fileId: string;
  fileName: string;
  sourceId: string;
  status: 'STARTED' | 'COMPLETED' | 'FAILED';
  totalTokens?: number;
  validTokens?: number;
  successCount?: number;
  failureCount?: number;
  startTime?: Date;
  endTime?: Date;
  errorMessage?: string;
}

/**
 * Send email notification using Azure Communication Services
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const config = getConfig();

  if (!config.EMAIL_ENABLED) {
    logger.info('Email disabled, logging instead', {
      to: options.to,
      subject: options.subject,
    });
    logger.debug('Email body', { body: options.body });
    return true;
  }

  try {
    // Validate required configuration
    if (!config.ACS_CONNECTION_STRING) {
      logger.error('Azure Communication Services connection string not configured');
      return false;
    }

    if (!config.EMAIL_FROM) {
      logger.error('EMAIL_FROM not configured');
      return false;
    }

    // Initialize Azure Communication Services Email client
    const emailClient = new EmailClient(config.ACS_CONNECTION_STRING);

    // Prepare recipients
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    // Send email using Azure Communication Services
    const emailMessage = {
      senderAddress: config.EMAIL_FROM,
      content: options.isHtml
        ? {
            subject: options.subject,
            html: options.body,
          }
        : {
            subject: options.subject,
            plainText: options.body,
          },
      recipients: {
        to: recipients.map((email) => ({ address: email })),
      },
    };

    const poller = await emailClient.beginSend(emailMessage);
    const result = await poller.pollUntilDone();

    logger.info('Email sent successfully via Azure Communication Services', {
      to: options.to,
      subject: options.subject,
      messageId: result.id,
      status: result.status,
    });

    return true;
  } catch (error) {
    logger.error('Failed to send email via Azure Communication Services', error, {
      to: options.to,
      subject: options.subject,
    });
    return false;
  }
}

/**
 * Send migration start notification
 */
export async function sendMigrationStartEmail(data: MigrationEmailData): Promise<boolean> {
  const subject = `[Token Migration] Started - ${data.sourceId} - ${data.fileName}`;

  const body = `
Token Migration Started

File Details:
- File ID: ${data.fileId}
- File Name: ${data.fileName}
- Source: ${data.sourceId}
- Total Tokens: ${data.totalTokens ?? 'N/A'}
- Start Time: ${data.startTime?.toISOString() ?? new Date().toISOString()}

The migration process has begun. You will receive another notification when it completes.

To terminate the migration, please contact the operations team.
  `.trim();

  return sendEmail({
    to: getEmailRecipients(),
    subject,
    body,
  });
}

/**
 * Send migration completion notification
 */
export async function sendMigrationCompleteEmail(data: MigrationEmailData): Promise<boolean> {
  const subject = `[Token Migration] Completed - ${data.sourceId} - ${data.fileName}`;

  const duration = data.startTime && data.endTime
    ? Math.round((data.endTime.getTime() - data.startTime.getTime()) / 1000)
    : 'N/A';

  const successRate = data.totalTokens && data.successCount
    ? ((data.successCount / data.totalTokens) * 100).toFixed(2)
    : 'N/A';

  const body = `
Token Migration Completed Successfully

File Details:
- File ID: ${data.fileId}
- File Name: ${data.fileName}
- Source: ${data.sourceId}

Results:
- Total Tokens: ${data.totalTokens ?? 'N/A'}
- Valid Tokens: ${data.validTokens ?? 'N/A'}
- Successfully Migrated: ${data.successCount ?? 'N/A'}
- Failed: ${data.failureCount ?? 'N/A'}
- Success Rate: ${successRate}%

Timing:
- Start Time: ${data.startTime?.toISOString() ?? 'N/A'}
- End Time: ${data.endTime?.toISOString() ?? 'N/A'}
- Duration: ${duration} seconds

The response file has been generated and placed in the output folder.
  `.trim();

  return sendEmail({
    to: getEmailRecipients(),
    subject,
    body,
  });
}

/**
 * Send migration failure notification
 */
export async function sendMigrationFailureEmail(data: MigrationEmailData): Promise<boolean> {
  const subject = `[ALERT] Token Migration Failed - ${data.sourceId} - ${data.fileName}`;

  const body = `
Token Migration Failed

File Details:
- File ID: ${data.fileId}
- File Name: ${data.fileName}
- Source: ${data.sourceId}

Error:
${data.errorMessage ?? 'Unknown error occurred'}

Statistics at failure:
- Total Tokens: ${data.totalTokens ?? 'N/A'}
- Valid Tokens: ${data.validTokens ?? 'N/A'}
- Successfully Migrated: ${data.successCount ?? 'N/A'}
- Failed: ${data.failureCount ?? 'N/A'}

Please investigate the issue and retry if necessary.
Check the audit logs for more details.
  `.trim();

  return sendEmail({
    to: getEmailRecipients(),
    subject,
    body,
  });
}

/**
 * Send validation failure notification (when threshold exceeded)
 */
export async function sendValidationFailureEmail(
  data: MigrationEmailData & { failurePercent: number; threshold: number }
): Promise<boolean> {
  const subject = `[ALERT] Token Validation Failed - ${data.sourceId} - ${data.fileName}`;

  const body = `
Token Migration Rejected - Validation Failure Threshold Exceeded

File Details:
- File ID: ${data.fileId}
- File Name: ${data.fileName}
- Source: ${data.sourceId}

Validation Results:
- Total Tokens: ${data.totalTokens ?? 'N/A'}
- Valid Tokens: ${data.validTokens ?? 'N/A'}
- Failure Rate: ${data.failurePercent.toFixed(2)}%
- Threshold: ${data.threshold}%

The file has been rejected because the validation failure rate exceeded the configured threshold.

Please review the input file for data quality issues and resubmit.
  `.trim();

  return sendEmail({
    to: getEmailRecipients(),
    subject,
    body,
  });
}
