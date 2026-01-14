import { app, InvocationContext } from '@azure/functions';
import { getPool, updateFileStatus } from '../services/database';
import { sendToCreateBatchQueue, ValidateTokensMessage } from '../services/queueService';

interface ValidationError {
  code: string;
  message: string;
}

/**
 * Queue trigger function to validate tokens
 * Validates token format and checks for duplicates
 */
export async function validateTokensDelta(
  message: ValidateTokensMessage,
  context: InvocationContext
): Promise<void> {
  const { fileId, sourceId, fileName } = message;

  context.log(`Delta Migration - Validating tokens for file: ${fileId}`);

  try {
    const db = await getPool();

    // Update file status
    await updateFileStatus(fileId, 'VALIDATING');

    // Get all pending tokens for this file
    const tokensResult = await db.request()
      .input('fileId', fileId)
      .query(`
        SELECT ID, MONERIS_TOKEN, EXP_DATE, ENTITY_ID, ENTITY_TYPE, ENTITY_STATUS
        FROM MONERIS_TOKENS_STAGING
        WHERE FILE_ID = @fileId AND VALIDATION_STATUS = 'PENDING'
      `);

    const tokens = tokensResult.recordset;
    context.log(`Found ${tokens.length} tokens to validate`);

    let validCount = 0;
    let invalidCount = 0;

    for (const token of tokens) {
      const errors = validateToken(token);

      if (errors.length === 0) {
        // Check for duplicate in existing data
        const dupCheck = await db.request()
          .input('monerisToken', token.MONERIS_TOKEN)
          .input('currentId', token.ID)
          .query(`
            SELECT COUNT(*) as count FROM MONERIS_TOKENS_STAGING
            WHERE MONERIS_TOKEN = @monerisToken AND ID != @currentId AND VALIDATION_STATUS = 'VALID'
          `);

        if (dupCheck.recordset[0].count > 0) {
          await updateTokenValidation(db, token.ID, 'DUPLICATE', 'Token already exists in staging');
          invalidCount++;
        } else {
          await updateTokenValidation(db, token.ID, 'VALID', null);
          validCount++;
        }
      } else {
        const errorStr = errors.map(e => `${e.code}: ${e.message}`).join('; ');
        await updateTokenValidation(db, token.ID, 'INVALID', errorStr);
        invalidCount++;
      }
    }

    // Update file status with counts
    await updateFileStatus(fileId, 'VALIDATED', validCount, invalidCount);

    context.log(`Validation complete. Valid: ${validCount}, Invalid: ${invalidCount}`);

    // Queue batch creation if we have valid tokens
    if (validCount > 0) {
      await sendToCreateBatchQueue({ fileId, sourceId });
      context.log(`Queued batch creation for file ${fileId}`);
    } else {
      context.log(`No valid tokens to process for file ${fileId}`);
      await updateFileStatus(fileId, 'COMPLETED', validCount, invalidCount);
    }

  } catch (error) {
    context.error(`Error validating tokens for file ${fileId}:`, error);
    await updateFileStatus(fileId, 'FAILED');
    throw error;
  }
}

function validateToken(token: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate MONERIS_TOKEN
  if (!token.MONERIS_TOKEN) {
    errors.push({ code: 'E001', message: 'Moneris token is required' });
  } else if (!/^\d+$/.test(token.MONERIS_TOKEN)) {
    errors.push({ code: 'E001', message: 'Moneris token must be numeric' });
  } else if (token.MONERIS_TOKEN.length !== 16) {
    errors.push({ code: 'E002', message: 'Moneris token must be 16 digits' });
  } else if (!token.MONERIS_TOKEN.startsWith('9')) {
    errors.push({ code: 'E003', message: 'Moneris token must start with 9' });
  }

  // Validate EXP_DATE (MMYY format)
  if (token.EXP_DATE) {
    if (!/^\d{4}$/.test(token.EXP_DATE)) {
      errors.push({ code: 'E004', message: 'Expiry date must be in MMYY format' });
    } else {
      const month = parseInt(token.EXP_DATE.substring(0, 2));
      if (month < 1 || month > 12) {
        errors.push({ code: 'E005', message: 'Invalid expiry month' });
      }
    }
  }

  // Validate ENTITY_ID
  if (!token.ENTITY_ID) {
    errors.push({ code: 'E006', message: 'Entity ID is required' });
  }

  // Validate ENTITY_TYPE
  if (!token.ENTITY_TYPE) {
    errors.push({ code: 'E007', message: 'Entity type is required' });
  } else if (!['1', '2'].includes(token.ENTITY_TYPE)) {
    errors.push({ code: 'E009', message: 'Entity type must be 1 or 2' });
  }

  // Validate ENTITY_STATUS
  if (token.ENTITY_STATUS && !['O', 'S', 'N', 'C'].includes(token.ENTITY_STATUS)) {
    errors.push({ code: 'E010', message: 'Invalid entity status' });
  }

  return errors;
}

async function updateTokenValidation(db: any, tokenId: number, status: string, errors: string | null): Promise<void> {
  await db.request()
    .input('id', tokenId)
    .input('status', status)
    .input('errors', errors)
    .query(`
      UPDATE MONERIS_TOKENS_STAGING
      SET VALIDATION_STATUS = @status, VALIDATION_ERRORS = @errors, UPDATED_AT = GETUTCDATE()
      WHERE ID = @id
    `);
}

app.storageQueue('validateTokensDelta', {
  queueName: 'delta-validate-tokens',
  connection: 'AzureWebJobsStorage',
  handler: validateTokensDelta,
});
