# Token Migration - Implementation Status

## Overview

This document tracks the implementation status of field mappings and transformations for the Mass Migration process

---

## COMPLETED IMPLEMENTATIONS

### Core Transformations

| Field | Source | Transformation Logic |
|-------|--------|---------------------|
| **PMR** | PG_TOKEN | Replace first digit from 9 to 8 (e.g., `9703796509383554` -> `8703796509383554`) |
| **PM_TYPE_ID** | PAYMENT_METHOD_TYPE | Decode: CREDIT=1, DEBIT=2, PREPAID=3, OTHER=4 |
| **PM_STATUS** | Hardcoded | Always 'A' (Active) |
| **FIRST_SIX** | SOURCEOFFUNDS_NUMBER | Extract first 6 characters (e.g., `512345xxxxxx2346` -> `512345`) |
| **LAST_FOUR** | SOURCEOFFUNDS_NUMBER | Extract last 4 characters (e.g., `512345xxxxxx2346` -> `2346`) |
| **ENTITY_REF_ID** | ENTITY_TYPE | Decode: ACCOUNTNUM=1, GUID=2, EMAILID=3, VOICEID=4 |
| **PM_IS_PREF** | Hardcoded | Always 'N' (Not preferred) |
| **CC_TOKEN** | PG_TOKEN | Direct mapping |
| **CC_EXP_DATE** | PG_TOKENS_STAGING.CC_EXP_DATE | Direct mapping |
| **CC_CARD_BRAND** | PG_TOKENS_STAGING.CC_CARD_BRAND | Direct mapping |
| **PM_LAST_USE_DATE** | MONERIS_TOKENS_STAGING.LAST_USE_DATE | Direct mapping to PAYMENT_METHOD table |

### Batch & File Management

| Field | Source | Implementation |
|-------|--------|----------------|
| **CONTEXT** | Hardcoded | Always 'MassMigPG' |
| **BATCH_CONTEXT** | Default | Empty JSON '{}' |
| **PG_OUT_FILE** | Generated | MC input filename set after file generation |
| **FILE_ID** | Filename | Generated from input filename pattern |
| **BATCH_ID** | Generated | Format: `{fileId}.B{batchNumber.padStart(4, '0')}` |
| **SOURCE_ID** | Filename | Decoded from filename |
| **TOKEN_TYPE** | Filename | Decoded from filename |

### Payment Hub Tables Created

| Table | Purpose | Status |
|-------|---------|--------|
| **PAYMENT_METHOD_TYPE** | Reference table for payment types (CC, DC, AP, GP, CTP) | Created with seed data |
| **ENTITY_REF** | Reference table for entity types (ACCOUNTNUM, GUID, EMAILID, VOICEID) | Created with seed data |
| **PAYMENT_METHOD** | Main payment method records with PMR (includes PM_LAST_USE_DATE) | Created |
| **TOKENIZED_CARD** | Card details linked to PMR | Created |
| **ENTITY_DETAILS** | Entity information (account, GUID, etc.) | Created |
| **ENTITY_PMR_MAPPING** | Links entities to payment methods | Created |
| **TOKEN_ACTIVITY_LOG** | Tracks token updates (PAN, expiry changes) | Created |
| **PMR_MONERIS_MAPPING** | Maps PMR to Moneris and PG tokens | Created |

### Payment Hub Population

The batch worker now populates the following tables after successful token migration:

1. **PAYMENT_METHOD** - Creates PMR record with PM_TYPE_ID, status, creation channel, PM_LAST_USE_DATE
2. **TOKENIZED_CARD** - Links CC_TOKEN to PMR with card details
3. **ENTITY_DETAILS** - Creates entity record if ENTITY_ID exists (with duplicate check)
4. **ENTITY_PMR_MAPPING** - Links entity to PMR
5. **PMR_MONERIS_MAPPING** - Links PMR to MONERIS_TOKEN and PG_TOKEN for reference

---

## PENDING - Awaiting Clarification

These fields require additional information or mapping tables before implementation:

### Fields Needing Mapping Tables

| Field | Required Mapping|
|-------|-----------------|
| **ISSUER_NAME** | ROGERS_BANK_MAPPING table |
| **CARD_LEVEL** | ROGERS_BANK_MAPPING table |
| **APPLICATION_INDICATOR** | SYSTEM_INDICATOR_MAPPING table |
| **SYSTEM_INDICATOR** | SYSTEM_INDICATOR_MAPPING table |

### Fields Needing Business Logic Clarification

| Field | Current Value 
|-------|--------------|
| **ENTITY_STATUS** | Hardcoded 'A' |
| **PM_TYPE_ID for PREPAID** | 3 |
| **PM_TYPE_ID for OTHER** | 4 |
| **PM_USAGE_TYPE** | null |
| **PM_CREATION_CHANNEL** | 'MIGRATION' |
| **PM_UPDATED_CHANNEL** | 'MIGRATION' |


### Qualification/Status Fields (Separate Processing)

| Field | Description |
|-------|-------------|
| **PG_EXPORT_QUALIFICATION** | Calculate: 'QUALIFIED', 'NOT_QUALIFIED', etc. |
| **PG_EXPORT_STATUS** | Calculate: 'Ready', 'DUPLICATE_PHUB', 'DUPLICATE_SOURCE_FILE', etc. |
| **ENTITY_UPDATE_STATUS** | Calculate from PHUB Tables, staging tables |
| **BILLING_EXPORT_STATUS** | Calculate: 'TBD', 'Ready', etc. |
| **VALIDATION_STATUS** | Calculate: 'MATCHED' if token exists in MONERIS_TOKENS_STAGING, 'MISSING_IN_SOURCE' otherwise |

