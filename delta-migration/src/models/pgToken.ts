export interface PgToken {
  id?: number;
  fileId: string;
  monerisToken: string;
  pgToken: string;
  correlationId: string;
  maskedPan?: string;
  cardBrand?: string;
  fundingMethod?: string;
  firstSix?: string;
  lastFour?: string;
  expiryMonth?: string;
  expiryYear?: string;
  status: 'SUCCESS' | 'ERROR';
  errorCode?: string;
  errorMessage?: string;
  failedStep?: string;
  createdAt?: Date;
}

export interface PgTokenizationResult {
  correlationId: string;
  monerisToken: string;
  pgToken?: string;
  result: 'SUCCESS' | 'ERROR';
  maskedPan?: string;
  cardBrand?: string;
  fundingMethod?: string;
  firstSix?: string;
  lastFour?: string;
  expiryMonth?: string;
  expiryYear?: string;
  errorCode?: string;
  errorMessage?: string;
  failedStep?: string;
}
