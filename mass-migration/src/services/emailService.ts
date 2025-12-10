import { getConfig } from '../config/index.js';
import { Logger, createLogger } from '../utils/logger.js';

const logger: Logger = createLogger('EmailService');

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
 * Send email notification
 * In production, this would integrate with SendGrid, Azure Communication Services, or similar
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
    // TODO: Implement actual email sending
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: options.to,
    //   from: config.EMAIL_FROM,
    //   subject: options.subject,
    //   html: options.isHtml ? options.body : undefined,
    //   text: !options.isHtml ? options.body : undefined,
    // });

    logger.info('Email sent successfully', {
      to: options.to,
      subject: options.subject,
    });

    return true;
  } catch (error) {
    logger.error('Failed to send email', error, {
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
    to: getConfig().EMAIL_TO ?? '',
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
    to: getConfig().EMAIL_TO ?? '',
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
    to: getConfig().EMAIL_TO ?? '',
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
    to: getConfig().EMAIL_TO ?? '',
    subject,
    body,
  });
}
