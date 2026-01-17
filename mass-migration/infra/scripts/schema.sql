-- =====================================================
-- Token Migration Database Schema
-- Version: 1.0.0
-- Description: Schema for Mass Migration Azure Functions
-- =====================================================

-- Enable ANSI settings
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =====================================================
-- 1. MONERIS_TOKENS_STAGING
-- Stores input Moneris tokens with migration status
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MONERIS_TOKENS_STAGING]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MONERIS_TOKENS_STAGING] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [FILE_ID] VARCHAR(50) NOT NULL,
        [BATCH_ID] VARCHAR(50) NULL,
        [MONERIS_TOKEN] VARCHAR(32) NOT NULL,
        [EXP_DATE] VARCHAR(10) NULL,
        [ENTITY_ID] VARCHAR(50) NULL,
        [ENTITY_TYPE] VARCHAR(4) NULL,
        [ENTITY_STS] VARCHAR(4) NULL,
        [CREATION_DATE] DATE NULL,
        [LAST_USE_DATE] DATE NULL,
        [TRX_SEQ_NO] VARCHAR(36) NULL,
        [BUSINESS_UNIT] VARCHAR(20) NULL,
        [VALIDATION_STATUS] VARCHAR(20) DEFAULT 'PENDING',
        [MIGRATION_STATUS] VARCHAR(20) DEFAULT 'PENDING',
        [ERROR_CODE] VARCHAR(20) NULL,
        [PMR] VARCHAR(16) NULL,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        [UPDATED_BY] VARCHAR(50) NULL,
        [COHORT_ID] VARCHAR(50) NULL,
        [USAGE_TYPE] VARCHAR(50) NULL,
        [PM_TYPE_ID] VARCHAR(50) NULL,
        [PM_STATUS] VARCHAR(50) NULL,
        [CC_TOKEN] VARCHAR(50) NULL,
        [CC_EXP_DATE] VARCHAR(50) NULL,
        [CC_CARD_BRAND] VARCHAR(50) NULL,
        [FIRST_SIX] VARCHAR(50) NULL,
        [LAST_FOUR] VARCHAR(50) NULL,
        [MONERIS_TOKEN_SOURCE] VARCHAR(50) NULL,
        [PM_CREATION_CHANNEL] VARCHAR(50) NULL,
        [PM_UPDATED_CHANNEL] VARCHAR(50) NULL,
        [ISSUER_NAME] VARCHAR(50) NULL,
        [CARD_LEVEL] VARCHAR(50) NULL,
        [ENTITY_REF_ID] VARCHAR(50) NULL,
        [PM_USAGE_TYPE] VARCHAR(50) NULL,
        [PM_IS_PREF] VARCHAR(50) NULL,
        [ENTITY_STATUS] VARCHAR(50) NULL,
        [PG_INPUT_FILE] VARCHAR(50) NULL,
        [PG_EXPORT_STATUS] VARCHAR(50) NULL,
        [PG_OUT_FILE] VARCHAR(50) NULL,
        CONSTRAINT [PK_MONERIS_TOKENS_STAGING] PRIMARY KEY CLUSTERED ([ID] ASC)
    );

    -- Indexes for common queries
    CREATE NONCLUSTERED INDEX [IX_MONERIS_FILE_ID] ON [dbo].[MONERIS_TOKENS_STAGING] ([FILE_ID]);
    CREATE NONCLUSTERED INDEX [IX_MONERIS_BATCH_ID] ON [dbo].[MONERIS_TOKENS_STAGING] ([BATCH_ID]);
    CREATE NONCLUSTERED INDEX [IX_MONERIS_TOKEN] ON [dbo].[MONERIS_TOKENS_STAGING] ([MONERIS_TOKEN]);
    CREATE NONCLUSTERED INDEX [IX_MONERIS_VALIDATION_STATUS] ON [dbo].[MONERIS_TOKENS_STAGING] ([VALIDATION_STATUS]);
    CREATE NONCLUSTERED INDEX [IX_MONERIS_MIGRATION_STATUS] ON [dbo].[MONERIS_TOKENS_STAGING] ([MIGRATION_STATUS]);
END
GO

-- =====================================================
-- 2. PG_TOKENS_STAGING
-- Stores Mastercard response tokens
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PG_TOKENS_STAGING]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PG_TOKENS_STAGING] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [FILE_ID] VARCHAR(50) NOT NULL,
        [BATCH_ID] VARCHAR(50) NULL,
        [MONERIS_TOKEN] VARCHAR(32) NOT NULL,
        [PG_TOKEN] VARCHAR(32) NULL,
        [CARD_NUMBER_MASKED] VARCHAR(20) NULL,
        [FIRST_SIX] VARCHAR(6) NULL,
        [LAST_FOUR] VARCHAR(4) NULL,
        [FUNDING_METHOD] VARCHAR(20) NULL,
        [EXP_MONTH] VARCHAR(2) NULL,
        [EXP_YEAR] VARCHAR(2) NULL,
        [ERROR_CAUSE] VARCHAR(50) NULL,
        [ERROR_EXPLANATION] VARCHAR(255) NULL,
        [ERROR_FIELD] VARCHAR(50) NULL,
        [ERROR_SUPPORT_CODE] VARCHAR(20) NULL,
        [MIGRATION_STATUS] VARCHAR(20) DEFAULT 'PENDING',
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        [NETWORK_TOKEN_STATUS] VARCHAR(50) NULL,
        [CC_CARD_BRAND] VARCHAR(20) NULL,
        [CC_EXP_DATE] VARCHAR(20) NULL,
        [MONERIS_FILE_ID] BIGINT NULL,
        [VALIDATION_STATUS] VARCHAR(20) NULL,
        [APIOPERATION] VARCHAR(50) NULL,
        [PAYMENT_METHOD_TYPE] VARCHAR(20) NULL,
        [SOURCEOFFUNDS_TYPE] VARCHAR(50) NULL,
        [SOURCEOFFUNDS_NUMBER] VARCHAR(20) NULL,
        [MONERIS_EXPIRY_MONTH] VARCHAR(2) NULL,
        [MONERIS_EXPIRY_YEAR] VARCHAR(2) NULL,
        [MONERIS2PG_MIGRATION_STATUS] VARCHAR(20) NULL,
        CONSTRAINT [PK_PG_TOKENS_STAGING] PRIMARY KEY CLUSTERED ([ID] ASC)
    );

    CREATE NONCLUSTERED INDEX [IX_PG_FILE_ID] ON [dbo].[PG_TOKENS_STAGING] ([FILE_ID]);
    CREATE NONCLUSTERED INDEX [IX_PG_BATCH_ID] ON [dbo].[PG_TOKENS_STAGING] ([BATCH_ID]);
    CREATE NONCLUSTERED INDEX [IX_PG_MONERIS_TOKEN] ON [dbo].[PG_TOKENS_STAGING] ([MONERIS_TOKEN]);
    CREATE NONCLUSTERED INDEX [IX_MONERIS2PG_MIGRATION_STATUS] ON [dbo].[PG_TOKENS_STAGING] ([MONERIS2PG_MIGRATION_STATUS]);
END
GO

-- =====================================================
-- 3. TOKEN_MIGRATION_BATCH
-- Tracks files and batches for reporting
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TOKEN_MIGRATION_BATCH]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TOKEN_MIGRATION_BATCH] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [BATCH_ID] VARCHAR(50) NOT NULL,
        [FILE_ID] VARCHAR(50) NULL,
        [FILE_NAME] VARCHAR(255) NULL,
        [SOURCE_ID] VARCHAR(20) NULL,
        [TOKEN_TYPE] CHAR(1) NULL,
        [MIGRATION_TYPE] VARCHAR(20) NULL,
        [CONTEXT] VARCHAR(20) NULL,
        [STATUS] VARCHAR(20) DEFAULT 'PENDING',
        [TOTAL_TOKEN_COUNT] INT DEFAULT 0,
        [VALID_TOKEN_COUNT] INT DEFAULT 0,
        [SUCCESS_COUNT] INT DEFAULT 0,
        [FAILURE_COUNT] INT DEFAULT 0,
        [BATCH_SIZE] INT NULL,
        [BATCH_NUMBER] INT NULL,
        [TOTAL_BATCHES] INT NULL,
        [FILE_TIMESTAMP] DATETIME2 NULL,
        [PROCESS_START_TIME] DATETIME2 NULL,
        [PROCESS_END_TIME] DATETIME2 NULL,
        [BLOB_CONTAINER] VARCHAR(100) NULL,
        [BLOB_PATH] VARCHAR(500) NULL,
        [BATCH_CONTEXT] NVARCHAR(MAX) DEFAULT '{}',
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_TOKEN_MIGRATION_BATCH] PRIMARY KEY CLUSTERED ([ID] ASC),
        CONSTRAINT [UQ_BATCH_ID] UNIQUE ([BATCH_ID])
    );

    CREATE NONCLUSTERED INDEX [IX_BATCH_FILE_ID] ON [dbo].[TOKEN_MIGRATION_BATCH] ([FILE_ID]);
    CREATE NONCLUSTERED INDEX [IX_BATCH_STATUS] ON [dbo].[TOKEN_MIGRATION_BATCH] ([STATUS]);
    CREATE NONCLUSTERED INDEX [IX_BATCH_SOURCE_ID] ON [dbo].[TOKEN_MIGRATION_BATCH] ([SOURCE_ID]);
END
GO

-- =====================================================
-- 4. TOKEN_MIGRATION_AUDIT_LOG
-- JSON-based audit logging
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TOKEN_MIGRATION_AUDIT_LOG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TOKEN_MIGRATION_AUDIT_LOG] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [FILE_ID] VARCHAR(50) NULL,
        [BATCH_ID] VARCHAR(50) NULL,
        [MESSAGE_CODE] VARCHAR(20) NULL,
        [MESSAGE_TEXT] VARCHAR(500) NULL,
        [ADDITIONAL_INFO] NVARCHAR(MAX) NULL,
        [LOG_LEVEL] VARCHAR(20) DEFAULT 'INFO',
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_TOKEN_MIGRATION_AUDIT_LOG] PRIMARY KEY CLUSTERED ([ID] ASC)
    );

    CREATE NONCLUSTERED INDEX [IX_AUDIT_FILE_ID] ON [dbo].[TOKEN_MIGRATION_AUDIT_LOG] ([FILE_ID]);
    CREATE NONCLUSTERED INDEX [IX_AUDIT_BATCH_ID] ON [dbo].[TOKEN_MIGRATION_AUDIT_LOG] ([BATCH_ID]);
    CREATE NONCLUSTERED INDEX [IX_AUDIT_CREATED_AT] ON [dbo].[TOKEN_MIGRATION_AUDIT_LOG] ([CREATED_AT] DESC);
END
GO

-- =====================================================
-- 5. MIGRATION_ERROR_DETAILS
-- Detailed error tracking per token
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MIGRATION_ERROR_DETAILS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MIGRATION_ERROR_DETAILS] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [FILE_ID] VARCHAR(50) NULL,
        [BATCH_ID] VARCHAR(50) NULL,
        [MONERIS_TOKEN] VARCHAR(16) NULL,
        [PG_TOKEN] VARCHAR(16) NULL,
        [ENTITY_ID] VARCHAR(50) NULL,
        [PMR] VARCHAR(16) NULL,
        [ERROR_CODE] VARCHAR(20) NULL,
        [ERROR_MESSAGE] VARCHAR(500) NULL,
        [ERROR_FIELD] VARCHAR(50) NULL,
        [ERROR_TYPE] VARCHAR(50) NULL,
        [RETRY_COUNT] INT DEFAULT 0,
        [IS_RETRYABLE] BIT DEFAULT 1,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_MIGRATION_ERROR_DETAILS] PRIMARY KEY CLUSTERED ([ID] ASC)
    );

    CREATE NONCLUSTERED INDEX [IX_ERROR_FILE_ID] ON [dbo].[MIGRATION_ERROR_DETAILS] ([FILE_ID]);
    CREATE NONCLUSTERED INDEX [IX_ERROR_BATCH_ID] ON [dbo].[MIGRATION_ERROR_DETAILS] ([BATCH_ID]);
    CREATE NONCLUSTERED INDEX [IX_ERROR_MONERIS_TOKEN] ON [dbo].[MIGRATION_ERROR_DETAILS] ([MONERIS_TOKEN]);
END
GO

-- =====================================================
-- 6. TOKEN_MIGRATION_WORKERS
-- Tracks worker instances
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TOKEN_MIGRATION_WORKERS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TOKEN_MIGRATION_WORKERS] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [WORKER_ID] VARCHAR(50) NOT NULL,
        [BATCH_ID] VARCHAR(50) NULL,
        [FILE_ID] VARCHAR(50) NULL,
        [MODE] VARCHAR(20) NULL,
        [STATUS] VARCHAR(20) DEFAULT 'IDLE',
        [TOKENS_PROCESSED] INT DEFAULT 0,
        [STARTED_AT] DATETIME2 NULL,
        [COMPLETED_AT] DATETIME2 NULL,
        [UPDATED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_TOKEN_MIGRATION_WORKERS] PRIMARY KEY CLUSTERED ([ID] ASC),
        CONSTRAINT [UQ_WORKER_ID] UNIQUE ([WORKER_ID])
    );

    CREATE NONCLUSTERED INDEX [IX_WORKER_STATUS] ON [dbo].[TOKEN_MIGRATION_WORKERS] ([STATUS]);
    CREATE NONCLUSTERED INDEX [IX_WORKER_BATCH_ID] ON [dbo].[TOKEN_MIGRATION_WORKERS] ([BATCH_ID]);
END
GO

-- =====================================================
-- 7. MIGRATION_CONFIG
-- Configuration reference table
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MIGRATION_CONFIG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MIGRATION_CONFIG] (
        [ID] INT IDENTITY(1,1) NOT NULL,
        [SOURCE_ID] VARCHAR(20) NULL,
        [CONFIG_KEY] VARCHAR(50) NOT NULL,
        [CONFIG_VALUE] VARCHAR(255) NULL,
        [DESCRIPTION] VARCHAR(255) NULL,
        [IS_ACTIVE] BIT DEFAULT 1,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_MIGRATION_CONFIG] PRIMARY KEY CLUSTERED ([ID] ASC)
    );

    CREATE UNIQUE NONCLUSTERED INDEX [UQ_CONFIG_KEY_SOURCE] ON [dbo].[MIGRATION_CONFIG] ([SOURCE_ID], [CONFIG_KEY]);
END
GO

-- =====================================================
-- 8. PAYMENT_METHOD_TYPE (Reference Table)
-- Payment method types: Credit Card, Debit Card, Apple Pay, etc.
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PAYMENT_METHOD_TYPE]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PAYMENT_METHOD_TYPE] (
        [PM_TYPE_ID] INT NOT NULL,
        [PM_TYPE_NAME] VARCHAR(50) NOT NULL,
        [PM_TYPE_VALUE] VARCHAR(10) NULL,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_PAYMENT_METHOD_TYPE] PRIMARY KEY CLUSTERED ([PM_TYPE_ID] ASC)
    );

    -- Insert default payment method types
    INSERT INTO [dbo].[PAYMENT_METHOD_TYPE] ([PM_TYPE_ID], [PM_TYPE_NAME], [PM_TYPE_VALUE])
    VALUES
        (1, 'Credit card', 'CC'),
        (2, 'Debit card', 'DC'),
        (3, 'Apple Pay', 'AP'),
        (4, 'Google Pay', 'GP'),
        (5, 'Click To Pay', 'CTP');
END
GO

-- =====================================================
-- 9. ENTITY_REF (Reference Table)
-- Entity reference types: Account Number, GUID, Email, etc.
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ENTITY_REF]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ENTITY_REF] (
        [ENTITY_REF_ID] INT NOT NULL,
        [ENTITY_REF_TYPE] VARCHAR(50) NOT NULL,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_ENTITY_REF] PRIMARY KEY CLUSTERED ([ENTITY_REF_ID] ASC)
    );

    -- Insert default entity reference types
    INSERT INTO [dbo].[ENTITY_REF] ([ENTITY_REF_ID], [ENTITY_REF_TYPE])
    VALUES
        (1, 'ACCOUNTNUM'),
        (2, 'GUID'),
        (3, 'EMAILID'),
        (4, 'VOICEID');
END
GO

-- =====================================================
-- 10. PAYMENT_METHOD
-- Main payment method table, PMR is derived from PG Token
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PAYMENT_METHOD]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PAYMENT_METHOD] (
        [PMR] VARCHAR(16) NOT NULL,
        [PM_TYPE_ID] INT NOT NULL,
        [PM_STATUS] VARCHAR(20) NULL,
        [PAR] VARCHAR(50) NULL,
        [PM_CREATION_DATE] DATETIME2 NULL,
        [PM_LAST_UPDATED] DATETIME2 NULL,
        [PM_LAST_USE_DATE] DATE NULL,
        [PM_CREATION_CHANNEL] VARCHAR(20) NULL,
        [PM_UPDATED_CHANNEL] VARCHAR(20) NULL,
        [INITIAL_TXN_ID] VARCHAR(50) NULL,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_PAYMENT_METHOD] PRIMARY KEY CLUSTERED ([PMR] ASC),
        CONSTRAINT [FK_PAYMENT_METHOD_TYPE] FOREIGN KEY ([PM_TYPE_ID]) REFERENCES [dbo].[PAYMENT_METHOD_TYPE]([PM_TYPE_ID])
    );

    CREATE NONCLUSTERED INDEX [IX_PM_STATUS] ON [dbo].[PAYMENT_METHOD] ([PM_STATUS]);
    CREATE NONCLUSTERED INDEX [IX_PM_TYPE_ID] ON [dbo].[PAYMENT_METHOD] ([PM_TYPE_ID]);
END
GO

-- =====================================================
-- 11. TOKENIZED_CARD
-- Card details linked to Payment Method
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TOKENIZED_CARD]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TOKENIZED_CARD] (
        [CC_TOKEN] VARCHAR(32) NOT NULL,
        [PMR] VARCHAR(16) NOT NULL,
        [CC_EXP_DATE] VARCHAR(10) NULL,
        [CC_CARD_BRAND] VARCHAR(20) NULL,
        [FIRST_SIX] VARCHAR(6) NULL,
        [LAST_FOUR] VARCHAR(4) NULL,
        [ISSUER_NAME] VARCHAR(100) NULL,
        [CARD_LEVEL] VARCHAR(20) NULL,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_TOKENIZED_CARD] PRIMARY KEY CLUSTERED ([CC_TOKEN] ASC),
        CONSTRAINT [FK_TOKENIZED_CARD_PMR] FOREIGN KEY ([PMR]) REFERENCES [dbo].[PAYMENT_METHOD]([PMR])
    );

    CREATE NONCLUSTERED INDEX [IX_TC_PMR] ON [dbo].[TOKENIZED_CARD] ([PMR]);
    CREATE NONCLUSTERED INDEX [IX_TC_CARD_BRAND] ON [dbo].[TOKENIZED_CARD] ([CC_CARD_BRAND]);
END
GO

-- =====================================================
-- 12. ENTITY_DETAILS
-- Entity information (account number, GUID, email, etc.)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ENTITY_DETAILS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ENTITY_DETAILS] (
        [ENTITY_ID] VARCHAR(50) NOT NULL,
        [ENTITY_REF_ID] INT NOT NULL,
        [ENTITY_VALUE] VARCHAR(255) NULL,
        [APPLICATION_INDICATOR] VARCHAR(50) NULL,
        [SYSTEM_INDICATOR] VARCHAR(50) NULL,
        [ENTITY_CREATION_DATE] DATETIME2 NULL,
        [ENTITY_LAST_UPDATED] DATETIME2 NULL,
        [PM_USAGE_TYPE] VARCHAR(50) NULL,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_ENTITY_DETAILS] PRIMARY KEY CLUSTERED ([ENTITY_ID] ASC),
        CONSTRAINT [FK_ENTITY_DETAILS_REF] FOREIGN KEY ([ENTITY_REF_ID]) REFERENCES [dbo].[ENTITY_REF]([ENTITY_REF_ID])
    );

    CREATE NONCLUSTERED INDEX [IX_ED_ENTITY_REF_ID] ON [dbo].[ENTITY_DETAILS] ([ENTITY_REF_ID]);
    CREATE NONCLUSTERED INDEX [IX_ED_ENTITY_VALUE] ON [dbo].[ENTITY_DETAILS] ([ENTITY_VALUE]);
END
GO

-- =====================================================
-- 13. ENTITY_PMR_MAPPING
-- Links entities to payment methods
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ENTITY_PMR_MAPPING]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ENTITY_PMR_MAPPING] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [ENTITY_ID] VARCHAR(50) NOT NULL,
        [PMR] VARCHAR(16) NOT NULL,
        [PM_USAGE_TYPE] VARCHAR(50) NULL,
        [PM_IS_PREF] CHAR(1) DEFAULT 'N',
        [ENTITY_STATUS] VARCHAR(20) NULL,
        [ENTITY_CREATION_DATE] DATETIME2 NULL,
        [ENTITY_LAST_UPDATED] DATETIME2 NULL,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_ENTITY_PMR_MAPPING] PRIMARY KEY CLUSTERED ([ID] ASC),
        CONSTRAINT [FK_EPM_ENTITY] FOREIGN KEY ([ENTITY_ID]) REFERENCES [dbo].[ENTITY_DETAILS]([ENTITY_ID]),
        CONSTRAINT [FK_EPM_PMR] FOREIGN KEY ([PMR]) REFERENCES [dbo].[PAYMENT_METHOD]([PMR])
    );

    CREATE NONCLUSTERED INDEX [IX_EPM_ENTITY_ID] ON [dbo].[ENTITY_PMR_MAPPING] ([ENTITY_ID]);
    CREATE NONCLUSTERED INDEX [IX_EPM_PMR] ON [dbo].[ENTITY_PMR_MAPPING] ([PMR]);
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_EPM_ENTITY_PMR_USAGE] ON [dbo].[ENTITY_PMR_MAPPING] ([ENTITY_ID], [PMR], [PM_USAGE_TYPE]);
END
GO

-- =====================================================
-- 14. TOKEN_ACTIVITY_LOG
-- Tracks changes to tokens (PAN updates, expiry updates)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TOKEN_ACTIVITY_LOG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TOKEN_ACTIVITY_LOG] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [PMR] VARCHAR(16) NOT NULL,
        [CC_TOKEN] VARCHAR(32) NOT NULL,
        [LAST_FOUR_CURRENT] VARCHAR(4) NULL,
        [EXP_DATE_CURRENT] VARCHAR(10) NULL,
        [IS_PAN_UPDATED] CHAR(1) DEFAULT 'N',
        [IS_EXP_DATE_UPDATED] CHAR(1) DEFAULT 'N',
        [LAST_FOUR_NEW] VARCHAR(4) NULL,
        [EXP_DATE_NEW] VARCHAR(10) NULL,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        [UPDATED_BY] VARCHAR(50) NULL,
        CONSTRAINT [PK_TOKEN_ACTIVITY_LOG] PRIMARY KEY CLUSTERED ([ID] ASC)
    );

    CREATE NONCLUSTERED INDEX [IX_TAL_PMR] ON [dbo].[TOKEN_ACTIVITY_LOG] ([PMR]);
    CREATE NONCLUSTERED INDEX [IX_TAL_CC_TOKEN] ON [dbo].[TOKEN_ACTIVITY_LOG] ([CC_TOKEN]);
    CREATE NONCLUSTERED INDEX [IX_TAL_CREATED_AT] ON [dbo].[TOKEN_ACTIVITY_LOG] ([CREATED_AT] DESC);
END
GO

-- =====================================================
-- 15. PMR_MONERIS_MAPPING
-- Maps PMR to Moneris and PG tokens
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PMR_MONERIS_MAPPING]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PMR_MONERIS_MAPPING] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [PMR] VARCHAR(16) NOT NULL,
        [MONERIS_TOKEN] VARCHAR(32) NOT NULL,
        [PG_TOKEN] VARCHAR(32) NOT NULL,
        [CREATION_DATE] DATETIME2 DEFAULT GETUTCDATE(),
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_PMR_MONERIS_MAPPING] PRIMARY KEY CLUSTERED ([ID] ASC),
        CONSTRAINT [FK_PMM_PMR] FOREIGN KEY ([PMR]) REFERENCES [dbo].[PAYMENT_METHOD]([PMR])
    );

    CREATE NONCLUSTERED INDEX [IX_PMM_PMR] ON [dbo].[PMR_MONERIS_MAPPING] ([PMR]);
    CREATE NONCLUSTERED INDEX [IX_PMM_MONERIS_TOKEN] ON [dbo].[PMR_MONERIS_MAPPING] ([MONERIS_TOKEN]);
    CREATE NONCLUSTERED INDEX [IX_PMM_PG_TOKEN] ON [dbo].[PMR_MONERIS_MAPPING] ([PG_TOKEN]);
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_PMM_PMR_MONERIS] ON [dbo].[PMR_MONERIS_MAPPING] ([PMR], [MONERIS_TOKEN]);
END
GO

-- =====================================================
-- 16. Insert Default Configuration
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[MIGRATION_CONFIG] WHERE [CONFIG_KEY] = 'DEFAULT_BATCH_SIZE')
BEGIN
    INSERT INTO [dbo].[MIGRATION_CONFIG] ([SOURCE_ID], [CONFIG_KEY], [CONFIG_VALUE], [DESCRIPTION])
    VALUES
        (NULL, 'DEFAULT_BATCH_SIZE', '1000', 'Default batch size for all sources'),
        (NULL, 'FAILURE_THRESHOLD_PERCENT', '50', 'Percentage of failures to reject file'),
        (NULL, 'MAX_ACTIVE_WORKERS', '10', 'Maximum concurrent batch workers'),
        (NULL, 'RETRY_MAX_COUNT', '3', 'Maximum retry attempts for failed tokens'),
        (NULL, 'FILE_ENCRYPTION_ENABLED', 'false', 'Enable file encryption for output'),
        ('V21', 'BATCH_SIZE', '1000', 'Batch size for V21 source'),
        ('V21', 'OUTPUT_ENCRYPTION', 'false', 'Encryption for V21 output files'),
        ('WINM', 'BATCH_SIZE', '500', 'Batch size for WinOnline Media source'),
        ('WINM', 'OUTPUT_ENCRYPTION', 'true', 'Encryption for WinOnline Media output files'),
        ('TSC', 'BATCH_SIZE', '1000', 'Batch size for TSC source'),
        ('TSC', 'OUTPUT_ENCRYPTION', 'false', 'Encryption for TSC output files');
END
GO

-- =====================================================
-- 9. Create Views for Reporting
-- =====================================================
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[VW_MIGRATION_SUMMARY]'))
    DROP VIEW [dbo].[VW_MIGRATION_SUMMARY]
GO

CREATE VIEW [dbo].[VW_MIGRATION_SUMMARY] AS
SELECT
    b.FILE_ID,
    b.FILE_NAME,
    b.SOURCE_ID,
    b.TOKEN_TYPE,
    b.MIGRATION_TYPE,
    b.STATUS AS FILE_STATUS,
    b.TOTAL_TOKEN_COUNT,
    b.VALID_TOKEN_COUNT,
    SUM(CASE WHEN m.MIGRATION_STATUS = 'COMPLETED' THEN 1 ELSE 0 END) AS MIGRATED_COUNT,
    SUM(CASE WHEN m.MIGRATION_STATUS = 'FAILED' THEN 1 ELSE 0 END) AS FAILED_COUNT,
    SUM(CASE WHEN m.MIGRATION_STATUS = 'PENDING' THEN 1 ELSE 0 END) AS PENDING_COUNT,
    b.PROCESS_START_TIME,
    b.PROCESS_END_TIME,
    DATEDIFF(SECOND, b.PROCESS_START_TIME, ISNULL(b.PROCESS_END_TIME, GETUTCDATE())) AS DURATION_SECONDS
FROM [dbo].[TOKEN_MIGRATION_BATCH] b
LEFT JOIN [dbo].[MONERIS_TOKENS_STAGING] m ON b.FILE_ID = m.FILE_ID
WHERE b.FILE_ID IS NOT NULL AND b.BATCH_ID = b.FILE_ID -- File-level record
GROUP BY
    b.FILE_ID, b.FILE_NAME, b.SOURCE_ID, b.TOKEN_TYPE, b.MIGRATION_TYPE,
    b.STATUS, b.TOTAL_TOKEN_COUNT, b.VALID_TOKEN_COUNT, b.PROCESS_START_TIME, b.PROCESS_END_TIME
GO

IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[VW_BATCH_STATUS]'))
    DROP VIEW [dbo].[VW_BATCH_STATUS]
GO

CREATE VIEW [dbo].[VW_BATCH_STATUS] AS
SELECT
    b.BATCH_ID,
    b.FILE_ID,
    b.SOURCE_ID,
    b.STATUS,
    b.BATCH_NUMBER,
    b.TOTAL_BATCHES,
    b.BATCH_SIZE,
    b.SUCCESS_COUNT,
    b.FAILURE_COUNT,
    b.PROCESS_START_TIME,
    b.PROCESS_END_TIME,
    DATEDIFF(SECOND, b.PROCESS_START_TIME, ISNULL(b.PROCESS_END_TIME, GETUTCDATE())) AS DURATION_SECONDS
FROM [dbo].[TOKEN_MIGRATION_BATCH] b
WHERE b.FILE_ID IS NOT NULL AND b.BATCH_ID != b.FILE_ID -- Batch-level records
GO

-- =====================================================
-- 10. Stored Procedures
-- =====================================================

-- Get configuration value
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_GET_CONFIG]') AND type in (N'P'))
    DROP PROCEDURE [dbo].[SP_GET_CONFIG]
GO

CREATE PROCEDURE [dbo].[SP_GET_CONFIG]
    @SourceId VARCHAR(20) = NULL,
    @ConfigKey VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 CONFIG_VALUE
    FROM [dbo].[MIGRATION_CONFIG]
    WHERE CONFIG_KEY = @ConfigKey
      AND (SOURCE_ID = @SourceId OR (SOURCE_ID IS NULL AND @SourceId IS NULL))
      AND IS_ACTIVE = 1
    ORDER BY
        CASE WHEN SOURCE_ID IS NOT NULL THEN 0 ELSE 1 END; -- Prefer source-specific config
END
GO

-- Update batch statistics
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_UPDATE_BATCH_STATS]') AND type in (N'P'))
    DROP PROCEDURE [dbo].[SP_UPDATE_BATCH_STATS]
GO

CREATE PROCEDURE [dbo].[SP_UPDATE_BATCH_STATS]
    @BatchId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE b
    SET
        b.SUCCESS_COUNT = stats.SuccessCount,
        b.FAILURE_COUNT = stats.FailureCount,
        b.UPDATED_AT = GETUTCDATE()
    FROM [dbo].[TOKEN_MIGRATION_BATCH] b
    CROSS APPLY (
        SELECT
            SUM(CASE WHEN MIGRATION_STATUS = 'COMPLETED' THEN 1 ELSE 0 END) AS SuccessCount,
            SUM(CASE WHEN MIGRATION_STATUS = 'FAILED' THEN 1 ELSE 0 END) AS FailureCount
        FROM [dbo].[MONERIS_TOKENS_STAGING]
        WHERE BATCH_ID = @BatchId
    ) stats
    WHERE b.BATCH_ID = @BatchId;
END
GO

-- =====================================================
-- SP_PROCESS_BATCH - High-performance batch processing
-- Processes entire batch in SQL without round-trips
-- =====================================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_PROCESS_BATCH]') AND type in (N'P'))
    DROP PROCEDURE [dbo].[SP_PROCESS_BATCH]
GO

CREATE PROCEDURE [dbo].[SP_PROCESS_BATCH]
    @BatchId VARCHAR(50),
    @FileId VARCHAR(50),
    @SuccessCount INT OUTPUT,
    @FailureCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Now DATETIME2 = GETUTCDATE();
    DECLARE @ErrorCount INT = 0;

    -- Create temp table to hold joined data with computed PMR
    CREATE TABLE #BatchTokens (
        MonerisId BIGINT NOT NULL,
        MONERIS_TOKEN VARCHAR(32) NOT NULL,
        EXP_DATE VARCHAR(10) NULL,
        ENTITY_ID VARCHAR(50) NULL,
        ENTITY_TYPE VARCHAR(4) NULL,
        LAST_USE_DATE DATE NULL,
        PG_TOKEN VARCHAR(32) NULL,
        PMR VARCHAR(16) NULL,
        FIRST_SIX VARCHAR(6) NULL,
        LAST_FOUR VARCHAR(4) NULL,
        FUNDING_METHOD VARCHAR(20) NULL,
        CC_CARD_BRAND VARCHAR(20) NULL,
        CC_EXP_DATE VARCHAR(20) NULL,
        PAYMENT_METHOD_TYPE VARCHAR(20) NULL,
        SOURCEOFFUNDS_NUMBER VARCHAR(20) NULL,
        MONERIS2PG_MIGRATION_STATUS VARCHAR(20) NULL,
        PM_TYPE_ID INT NULL,
        ENTITY_REF_ID INT NULL,
        IsSuccess BIT NOT NULL DEFAULT 0,
        PRIMARY KEY (MonerisId)
    );

    -- Step 1: Join Moneris and PG tokens, compute PMR and derived fields
    INSERT INTO #BatchTokens (
        MonerisId, MONERIS_TOKEN, EXP_DATE, ENTITY_ID, ENTITY_TYPE, LAST_USE_DATE,
        PG_TOKEN, PMR, FIRST_SIX, LAST_FOUR, FUNDING_METHOD, CC_CARD_BRAND,
        CC_EXP_DATE, PAYMENT_METHOD_TYPE, SOURCEOFFUNDS_NUMBER, MONERIS2PG_MIGRATION_STATUS,
        PM_TYPE_ID, ENTITY_REF_ID, IsSuccess
    )
    SELECT
        m.ID,
        m.MONERIS_TOKEN,
        m.EXP_DATE,
        m.ENTITY_ID,
        m.ENTITY_TYPE,
        m.LAST_USE_DATE,
        p.PG_TOKEN,
        -- Generate PMR: replace first digit with 8
        CASE WHEN p.PG_TOKEN IS NOT NULL THEN '8' + SUBSTRING(p.PG_TOKEN, 2, 15) ELSE NULL END,
        -- FIRST_SIX: prefer from PG, fallback to SOURCEOFFUNDS_NUMBER
        COALESCE(p.FIRST_SIX, LEFT(p.SOURCEOFFUNDS_NUMBER, 6)),
        -- LAST_FOUR: prefer from PG, fallback to SOURCEOFFUNDS_NUMBER
        COALESCE(p.LAST_FOUR, RIGHT(p.SOURCEOFFUNDS_NUMBER, 4)),
        p.FUNDING_METHOD,
        p.CC_CARD_BRAND,
        p.CC_EXP_DATE,
        p.PAYMENT_METHOD_TYPE,
        p.SOURCEOFFUNDS_NUMBER,
        p.MONERIS2PG_MIGRATION_STATUS,
        -- PM_TYPE_ID: decode PAYMENT_METHOD_TYPE
        CASE UPPER(p.PAYMENT_METHOD_TYPE)
            WHEN 'CREDIT' THEN 1
            WHEN 'DEBIT' THEN 2
            WHEN 'PREPAID' THEN 3
            ELSE 1
        END,
        -- ENTITY_REF_ID: decode ENTITY_TYPE (1=ACCOUNTNUM, 2=GUID)
        CASE m.ENTITY_TYPE
            WHEN '1' THEN 1
            WHEN '2' THEN 2
            WHEN '3' THEN 3
            WHEN '4' THEN 4
            ELSE 1
        END,
        -- IsSuccess: has valid PG token with SUCCESS status
        CASE WHEN p.PG_TOKEN IS NOT NULL AND p.MONERIS2PG_MIGRATION_STATUS = 'SUCCESS' THEN 1 ELSE 0 END
    FROM MONERIS_TOKENS_STAGING m
    LEFT JOIN PG_TOKENS_STAGING p ON m.MONERIS_TOKEN = p.MONERIS_TOKEN
    WHERE m.BATCH_ID = @BatchId;

    -- Get counts
    SELECT @SuccessCount = SUM(CASE WHEN IsSuccess = 1 THEN 1 ELSE 0 END),
           @FailureCount = SUM(CASE WHEN IsSuccess = 0 THEN 1 ELSE 0 END)
    FROM #BatchTokens;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Step 2: Insert PAYMENT_METHOD
        INSERT INTO PAYMENT_METHOD (PMR, PM_TYPE_ID, PM_STATUS, PAR, PM_CREATION_DATE, PM_LAST_UPDATED, PM_LAST_USE_DATE, PM_CREATION_CHANNEL, PM_UPDATED_CHANNEL, INITIAL_TXN_ID)
        SELECT t.PMR, t.PM_TYPE_ID, 'A', NULL, @Now, @Now, t.LAST_USE_DATE, 'MIGRATION', 'MIGRATION', NULL
        FROM #BatchTokens t WHERE t.IsSuccess = 1 AND t.PMR IS NOT NULL;

        -- Step 3: Insert TOKENIZED_CARD
        INSERT INTO TOKENIZED_CARD (CC_TOKEN, PMR, CC_EXP_DATE, CC_CARD_BRAND, FIRST_SIX, LAST_FOUR, ISSUER_NAME, CARD_LEVEL)
        SELECT t.PG_TOKEN, t.PMR, t.CC_EXP_DATE, t.CC_CARD_BRAND, t.FIRST_SIX, t.LAST_FOUR, NULL, NULL
        FROM #BatchTokens t WHERE t.IsSuccess = 1 AND t.PG_TOKEN IS NOT NULL;

        -- Step 4: Insert ENTITY_DETAILS (use NOT EXISTS for entities that may already exist from other batches)
        INSERT INTO ENTITY_DETAILS (ENTITY_ID, ENTITY_REF_ID, ENTITY_VALUE, APPLICATION_INDICATOR, SYSTEM_INDICATOR, ENTITY_CREATION_DATE, ENTITY_LAST_UPDATED)
        SELECT DISTINCT t.ENTITY_ID, t.ENTITY_REF_ID, t.ENTITY_ID, 'BILLING', 'MONERIS', @Now, @Now
        FROM #BatchTokens t
        WHERE t.IsSuccess = 1 AND t.ENTITY_ID IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM ENTITY_DETAILS WHERE ENTITY_ID = t.ENTITY_ID);

        -- Step 5: Insert ENTITY_PMR_MAPPING
        INSERT INTO ENTITY_PMR_MAPPING (ENTITY_ID, PMR, PM_USAGE_TYPE, PM_IS_PREF, ENTITY_STATUS, ENTITY_CREATION_DATE, ENTITY_LAST_UPDATED)
        SELECT t.ENTITY_ID, t.PMR, NULL, 'N', 'A', @Now, @Now
        FROM #BatchTokens t WHERE t.IsSuccess = 1 AND t.ENTITY_ID IS NOT NULL AND t.PMR IS NOT NULL;

        -- Step 6: Insert PMR_MONERIS_MAPPING
        INSERT INTO PMR_MONERIS_MAPPING (PMR, MONERIS_TOKEN, PG_TOKEN, CREATION_DATE)
        SELECT t.PMR, t.MONERIS_TOKEN, t.PG_TOKEN, @Now
        FROM #BatchTokens t WHERE t.IsSuccess = 1 AND t.PMR IS NOT NULL;

        -- Step 7: Update MONERIS_TOKENS_STAGING with success data
        UPDATE m
        SET
            MIGRATION_STATUS = 'COMPLETED',
            PMR = t.PMR,
            CC_TOKEN = t.PG_TOKEN,
            CC_EXP_DATE = t.CC_EXP_DATE,
            CC_CARD_BRAND = t.CC_CARD_BRAND,
            FIRST_SIX = t.FIRST_SIX,
            LAST_FOUR = t.LAST_FOUR,
            PM_TYPE_ID = CAST(t.PM_TYPE_ID AS VARCHAR(50)),
            PM_STATUS = 'A',
            PM_IS_PREF = 'N',
            UPDATED_AT = @Now
        FROM MONERIS_TOKENS_STAGING m
        INNER JOIN #BatchTokens t ON m.ID = t.MonerisId
        WHERE t.IsSuccess = 1;

        -- Step 8: Update MONERIS_TOKENS_STAGING with failure data
        UPDATE m
        SET
            MIGRATION_STATUS = 'FAILED',
            ERROR_CODE = 'NO_PG_TOKEN',
            UPDATED_AT = @Now
        FROM MONERIS_TOKENS_STAGING m
        INNER JOIN #BatchTokens t ON m.ID = t.MonerisId
        WHERE t.IsSuccess = 0;

        -- Step 9: Insert error details for failures
        INSERT INTO MIGRATION_ERROR_DETAILS (
            FILE_ID, BATCH_ID, MONERIS_TOKEN, ENTITY_ID,
            ERROR_CODE, ERROR_MESSAGE, ERROR_TYPE
        )
        SELECT
            @FileId,
            @BatchId,
            t.MONERIS_TOKEN,
            t.ENTITY_ID,
            'NO_PG_TOKEN',
            CASE
                WHEN t.MONERIS2PG_MIGRATION_STATUS IS NOT NULL
                THEN 'MC response: ' + t.MONERIS2PG_MIGRATION_STATUS
                ELSE 'No MC response found'
            END,
            'MIGRATION'
        FROM #BatchTokens t
        WHERE t.IsSuccess = 0;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        -- Re-throw the error
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH

    -- Cleanup
    DROP TABLE #BatchTokens;
END
GO

PRINT 'Schema creation completed successfully.'
GO
