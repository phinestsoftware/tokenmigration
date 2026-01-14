export interface MonerisToken {
  id?: number;
  fileId: string;
  monerisToken: string;
  expDate: string;
  entityId: string;
  entityType: string;
  entityStatus: string;
  creationDate?: string;
  lastUseDate?: string;
  trxSeqNo?: string;
  businessUnit?: string;
  validationStatus: 'PENDING' | 'VALID' | 'INVALID' | 'DUPLICATE';
  validationErrors?: string;
  migrationStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  batchId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MonerisTokenInput {
  MONERIS_TOKEN: string;
  EXP_DATE: string;
  ENTITY_ID: string;
  ENTITY_TYPE: string;
  ENTITY_STS: string;
  CREATION_DATE?: string;
  LAST_USE_DATE?: string;
  TRX_SEQ_NO?: string;
  BUSINESS_UNIT?: string;
}

export function mapInputToMonerisToken(input: MonerisTokenInput, fileId: string): MonerisToken {
  return {
    fileId,
    monerisToken: input.MONERIS_TOKEN,
    expDate: input.EXP_DATE,
    entityId: input.ENTITY_ID,
    entityType: input.ENTITY_TYPE,
    entityStatus: input.ENTITY_STS,
    creationDate: input.CREATION_DATE,
    lastUseDate: input.LAST_USE_DATE,
    trxSeqNo: input.TRX_SEQ_NO,
    businessUnit: input.BUSINESS_UNIT,
    validationStatus: 'PENDING',
    migrationStatus: 'PENDING',
  };
}
