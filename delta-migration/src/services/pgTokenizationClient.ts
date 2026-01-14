import { getConfig } from '../config';
import { PgTokenizationResult } from '../models/pgToken';
import { MonerisToken } from '../models/monerisToken';

export interface TokenizeRequest {
  correlationId: string;
  monerisToken: string;
  merchantId: string;
  expiryMonth?: string;
  expiryYear?: string;
  entityId?: string;
  entityType?: string;
}

export interface BatchTokenizeRequest {
  batchId: string;
  merchantId: string;
  records: Array<{
    correlationId: string;
    monerisToken: string;
    expiryMonth?: string;
    expiryYear?: string;
    entityId?: string;
    entityType?: string;
  }>;
}

export interface BatchTokenizeResponse {
  batchId: string;
  merchantId: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  status: string;
  results: PgTokenizationResult[];
}

/**
 * Client for PG Tokenization Service (CDE)
 * Calls PGTokenization service which orchestrates TNDispatcher + PGDispatcher
 */
export class PgTokenizationClient {
  private baseUrl: string;
  private merchantId: string;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.PG_TOKENIZATION_URL;
    this.merchantId = config.DEFAULT_MERCHANT_ID;
  }

  /**
   * Tokenize a single Moneris token to PG token
   */
  async tokenize(token: MonerisToken): Promise<PgTokenizationResult> {
    const request: TokenizeRequest = {
      correlationId: token.entityId,
      monerisToken: token.monerisToken,
      merchantId: this.merchantId,
      expiryMonth: token.expDate?.substring(0, 2),
      expiryYear: token.expDate?.substring(2, 4),
      entityId: token.entityId,
      entityType: token.entityType,
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/tokenization/tokenize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return this.mapResponse(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        correlationId: token.entityId,
        monerisToken: token.monerisToken,
        result: 'ERROR',
        errorCode: 'CLIENT_ERROR',
        errorMessage: errorMessage,
        failedStep: 'API_CALL',
      };
    }
  }

  /**
   * Batch tokenize multiple Moneris tokens
   */
  async tokenizeBatch(batchId: string, tokens: MonerisToken[]): Promise<BatchTokenizeResponse> {
    const request: BatchTokenizeRequest = {
      batchId,
      merchantId: this.merchantId,
      records: tokens.map(token => ({
        correlationId: token.entityId,
        monerisToken: token.monerisToken,
        expiryMonth: token.expDate?.substring(0, 2),
        expiryYear: token.expDate?.substring(2, 4),
        entityId: token.entityId,
        entityType: token.entityType,
      })),
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/tokenization/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        batchId: result.batchId,
        merchantId: result.merchantId,
        totalRecords: result.totalRecords,
        successCount: result.successCount,
        errorCount: result.errorCount,
        status: result.status,
        results: result.results.map((r: any) => this.mapResponse(r)),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Return all tokens as failed
      return {
        batchId,
        merchantId: this.merchantId,
        totalRecords: tokens.length,
        successCount: 0,
        errorCount: tokens.length,
        status: 'FAILED',
        results: tokens.map(token => ({
          correlationId: token.entityId,
          monerisToken: token.monerisToken,
          result: 'ERROR' as const,
          errorCode: 'BATCH_ERROR',
          errorMessage: errorMessage,
          failedStep: 'API_CALL',
        })),
      };
    }
  }

  /**
   * Health check for PG Tokenization service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tokenization/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private mapResponse(result: any): PgTokenizationResult {
    return {
      correlationId: result.correlationId,
      monerisToken: result.monerisToken,
      pgToken: result.pgToken,
      result: result.result,
      maskedPan: result.maskedPan,
      cardBrand: result.cardBrand,
      fundingMethod: result.fundingMethod,
      firstSix: result.firstSix,
      lastFour: result.lastFour,
      expiryMonth: result.expiryMonth,
      expiryYear: result.expiryYear,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      failedStep: result.failedStep,
    };
  }
}

// Singleton instance
let client: PgTokenizationClient | null = null;

export function getPgTokenizationClient(): PgTokenizationClient {
  if (!client) {
    client = new PgTokenizationClient();
  }
  return client;
}
