-- =====================================================
-- Delta Migration Database Schema
-- Version: 1.0.0
-- Description: Additional schema for Delta Migration Azure Functions
-- Note: This extends the mass-migration schema.sql
-- =====================================================

-- Enable ANSI settings
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =====================================================
-- 1. DELTA_MIGRATION_BATCH
-- Tracks delta migration batches (different from file-based mass migration)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DELTA_MIGRATION_BATCH]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DELTA_MIGRATION_BATCH] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [BATCH_ID] VARCHAR(100) NOT NULL,
        [FILE_ID] VARCHAR(50) NOT NULL,
        [SOURCE_ID] VARCHAR(20) NULL,
        [STATUS] VARCHAR(20) DEFAULT 'PENDING',
        [TOTAL_TOKENS] INT DEFAULT 0,
        [PROCESSED_TOKENS] INT DEFAULT 0,
        [SUCCESS_COUNT] INT DEFAULT 0,
        [ERROR_COUNT] INT DEFAULT 0,
        [RETRY_COUNT] INT DEFAULT 0,
        [PG_BATCH_ID] VARCHAR(100) NULL,
        [PG_BATCH_STATUS] VARCHAR(20) NULL,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        [COMPLETED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_DELTA_MIGRATION_BATCH] PRIMARY KEY CLUSTERED ([ID] ASC),
        CONSTRAINT [UQ_DELTA_BATCH_ID] UNIQUE ([BATCH_ID])
    );

    CREATE NONCLUSTERED INDEX [IX_DELTA_BATCH_FILE_ID] ON [dbo].[DELTA_MIGRATION_BATCH] ([FILE_ID]);
    CREATE NONCLUSTERED INDEX [IX_DELTA_BATCH_STATUS] ON [dbo].[DELTA_MIGRATION_BATCH] ([STATUS]);
    CREATE NONCLUSTERED INDEX [IX_DELTA_BATCH_SOURCE_ID] ON [dbo].[DELTA_MIGRATION_BATCH] ([SOURCE_ID]);
    CREATE NONCLUSTERED INDEX [IX_DELTA_PG_BATCH_ID] ON [dbo].[DELTA_MIGRATION_BATCH] ([PG_BATCH_ID]);
END
GO

-- =====================================================
-- 2. DELTA_TOKEN_RESULTS
-- Stores individual token migration results for delta
-- Links Moneris tokens to PG tokens with detailed status
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DELTA_TOKEN_RESULTS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DELTA_TOKEN_RESULTS] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [FILE_ID] VARCHAR(50) NOT NULL,
        [BATCH_ID] VARCHAR(100) NULL,
        [MONERIS_TOKEN] VARCHAR(32) NOT NULL,
        [PG_TOKEN] VARCHAR(32) NULL,
        [CORRELATION_ID] VARCHAR(50) NULL,
        [RESULT] VARCHAR(20) DEFAULT 'PENDING',
        [ERROR_CODE] VARCHAR(50) NULL,
        [ERROR_MESSAGE] VARCHAR(500) NULL,
        [CARD_BRAND] VARCHAR(20) NULL,
        [FIRST_SIX] VARCHAR(6) NULL,
        [LAST_FOUR] VARCHAR(4) NULL,
        [FUNDING_METHOD] VARCHAR(20) NULL,
        [EXP_MONTH] VARCHAR(2) NULL,
        [EXP_YEAR] VARCHAR(2) NULL,
        [RETRY_COUNT] INT DEFAULT 0,
        [PROCESSING_TIME_MS] INT NULL,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        [UPDATED_AT] DATETIME2 NULL,
        CONSTRAINT [PK_DELTA_TOKEN_RESULTS] PRIMARY KEY CLUSTERED ([ID] ASC)
    );

    CREATE NONCLUSTERED INDEX [IX_DELTA_RESULTS_FILE_ID] ON [dbo].[DELTA_TOKEN_RESULTS] ([FILE_ID]);
    CREATE NONCLUSTERED INDEX [IX_DELTA_RESULTS_BATCH_ID] ON [dbo].[DELTA_TOKEN_RESULTS] ([BATCH_ID]);
    CREATE NONCLUSTERED INDEX [IX_DELTA_RESULTS_MONERIS_TOKEN] ON [dbo].[DELTA_TOKEN_RESULTS] ([MONERIS_TOKEN]);
    CREATE NONCLUSTERED INDEX [IX_DELTA_RESULTS_PG_TOKEN] ON [dbo].[DELTA_TOKEN_RESULTS] ([PG_TOKEN]);
    CREATE NONCLUSTERED INDEX [IX_DELTA_RESULTS_RESULT] ON [dbo].[DELTA_TOKEN_RESULTS] ([RESULT]);
END
GO

-- =====================================================
-- 3. DELTA_API_CALLS
-- Audit log for API calls to PG Tokenization service
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DELTA_API_CALLS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DELTA_API_CALLS] (
        [ID] BIGINT IDENTITY(1,1) NOT NULL,
        [BATCH_ID] VARCHAR(100) NOT NULL,
        [FILE_ID] VARCHAR(50) NULL,
        [API_ENDPOINT] VARCHAR(200) NOT NULL,
        [HTTP_METHOD] VARCHAR(10) NOT NULL,
        [REQUEST_SIZE] INT NULL,
        [RESPONSE_SIZE] INT NULL,
        [HTTP_STATUS] INT NULL,
        [DURATION_MS] INT NULL,
        [SUCCESS] BIT DEFAULT 0,
        [ERROR_MESSAGE] VARCHAR(500) NULL,
        [TOKENS_IN_REQUEST] INT DEFAULT 0,
        [TOKENS_SUCCESSFUL] INT DEFAULT 0,
        [TOKENS_FAILED] INT DEFAULT 0,
        [CREATED_AT] DATETIME2 DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_DELTA_API_CALLS] PRIMARY KEY CLUSTERED ([ID] ASC)
    );

    CREATE NONCLUSTERED INDEX [IX_DELTA_API_BATCH_ID] ON [dbo].[DELTA_API_CALLS] ([BATCH_ID]);
    CREATE NONCLUSTERED INDEX [IX_DELTA_API_FILE_ID] ON [dbo].[DELTA_API_CALLS] ([FILE_ID]);
    CREATE NONCLUSTERED INDEX [IX_DELTA_API_CREATED_AT] ON [dbo].[DELTA_API_CALLS] ([CREATED_AT] DESC);
END
GO

-- =====================================================
-- 4. Add FILE_TYPE column to TOKEN_MIGRATION_BATCH if not exists
-- To distinguish between mass-migration and delta-migration files
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TOKEN_MIGRATION_BATCH]') AND name = 'FILE_TYPE')
BEGIN
    ALTER TABLE [dbo].[TOKEN_MIGRATION_BATCH]
    ADD [FILE_TYPE] VARCHAR(20) DEFAULT 'MASS';
END
GO

-- =====================================================
-- 5. Add additional columns to MONERIS_TOKENS_STAGING for delta
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[MONERIS_TOKENS_STAGING]') AND name = 'VALIDATION_ERRORS')
BEGIN
    ALTER TABLE [dbo].[MONERIS_TOKENS_STAGING]
    ADD [VALIDATION_ERRORS] VARCHAR(500) NULL;
END
GO

-- =====================================================
-- 6. Insert Delta-specific Configuration
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[MIGRATION_CONFIG] WHERE [CONFIG_KEY] = 'DELTA_BATCH_SIZE')
BEGIN
    INSERT INTO [dbo].[MIGRATION_CONFIG] ([SOURCE_ID], [CONFIG_KEY], [CONFIG_VALUE], [DESCRIPTION])
    VALUES
        (NULL, 'DELTA_BATCH_SIZE', '500', 'Default batch size for delta migration'),
        (NULL, 'DELTA_API_TIMEOUT_MS', '30000', 'API call timeout for PG Tokenization'),
        (NULL, 'DELTA_MAX_RETRIES', '3', 'Maximum retry attempts for failed API calls'),
        (NULL, 'DELTA_RETRY_DELAY_MS', '1000', 'Delay between retry attempts'),
        (NULL, 'PG_TOKENIZATION_URL', 'http://localhost:7070', 'PG Tokenization service URL');
END
GO

-- =====================================================
-- 7. Views for Delta Migration Reporting
-- =====================================================
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[VW_DELTA_MIGRATION_SUMMARY]'))
    DROP VIEW [dbo].[VW_DELTA_MIGRATION_SUMMARY]
GO

CREATE VIEW [dbo].[VW_DELTA_MIGRATION_SUMMARY] AS
SELECT
    f.FILE_ID,
    f.FILE_NAME,
    f.SOURCE_ID,
    f.STATUS AS FILE_STATUS,
    f.TOTAL_RECORDS,
    f.VALID_RECORDS,
    f.INVALID_RECORDS,
    ISNULL(batch_stats.total_batches, 0) AS TOTAL_BATCHES,
    ISNULL(batch_stats.completed_batches, 0) AS COMPLETED_BATCHES,
    ISNULL(batch_stats.failed_batches, 0) AS FAILED_BATCHES,
    ISNULL(batch_stats.pending_batches, 0) AS PENDING_BATCHES,
    ISNULL(token_stats.success_count, 0) AS SUCCESS_COUNT,
    ISNULL(token_stats.failure_count, 0) AS FAILURE_COUNT,
    f.UPLOADED_AT,
    f.PROCESSED_AT,
    DATEDIFF(SECOND, f.UPLOADED_AT, ISNULL(f.PROCESSED_AT, GETUTCDATE())) AS DURATION_SECONDS
FROM [dbo].[TOKEN_MIGRATION_BATCH] f
LEFT JOIN (
    SELECT
        FILE_ID,
        COUNT(*) as total_batches,
        SUM(CASE WHEN STATUS = 'COMPLETED' THEN 1 ELSE 0 END) as completed_batches,
        SUM(CASE WHEN STATUS = 'FAILED' THEN 1 ELSE 0 END) as failed_batches,
        SUM(CASE WHEN STATUS IN ('PENDING', 'PROCESSING') THEN 1 ELSE 0 END) as pending_batches
    FROM [dbo].[DELTA_MIGRATION_BATCH]
    GROUP BY FILE_ID
) batch_stats ON f.FILE_ID = batch_stats.FILE_ID
LEFT JOIN (
    SELECT
        FILE_ID,
        SUM(CASE WHEN RESULT = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN RESULT = 'FAILED' THEN 1 ELSE 0 END) as failure_count
    FROM [dbo].[DELTA_TOKEN_RESULTS]
    GROUP BY FILE_ID
) token_stats ON f.FILE_ID = token_stats.FILE_ID
WHERE f.FILE_TYPE = 'DELTA'
GO

IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[VW_DELTA_BATCH_STATUS]'))
    DROP VIEW [dbo].[VW_DELTA_BATCH_STATUS]
GO

CREATE VIEW [dbo].[VW_DELTA_BATCH_STATUS] AS
SELECT
    b.BATCH_ID,
    b.FILE_ID,
    b.SOURCE_ID,
    b.STATUS,
    b.TOTAL_TOKENS,
    b.PROCESSED_TOKENS,
    b.SUCCESS_COUNT,
    b.ERROR_COUNT,
    b.RETRY_COUNT,
    b.PG_BATCH_ID,
    b.PG_BATCH_STATUS,
    b.CREATED_AT,
    b.COMPLETED_AT,
    DATEDIFF(MILLISECOND, b.CREATED_AT, ISNULL(b.COMPLETED_AT, GETUTCDATE())) AS DURATION_MS
FROM [dbo].[DELTA_MIGRATION_BATCH] b
GO

-- =====================================================
-- 8. Stored Procedures for Delta Migration
-- =====================================================

-- Get batch statistics
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_GET_DELTA_BATCH_STATS]') AND type in (N'P'))
    DROP PROCEDURE [dbo].[SP_GET_DELTA_BATCH_STATS]
GO

CREATE PROCEDURE [dbo].[SP_GET_DELTA_BATCH_STATS]
    @BatchId VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        b.BATCH_ID,
        b.FILE_ID,
        b.STATUS,
        b.TOTAL_TOKENS,
        b.SUCCESS_COUNT,
        b.ERROR_COUNT,
        ISNULL(r.success_tokens, 0) as RESULT_SUCCESS,
        ISNULL(r.failed_tokens, 0) as RESULT_FAILED,
        ISNULL(r.pending_tokens, 0) as RESULT_PENDING
    FROM [dbo].[DELTA_MIGRATION_BATCH] b
    LEFT JOIN (
        SELECT
            BATCH_ID,
            SUM(CASE WHEN RESULT = 'SUCCESS' THEN 1 ELSE 0 END) as success_tokens,
            SUM(CASE WHEN RESULT = 'FAILED' THEN 1 ELSE 0 END) as failed_tokens,
            SUM(CASE WHEN RESULT = 'PENDING' THEN 1 ELSE 0 END) as pending_tokens
        FROM [dbo].[DELTA_TOKEN_RESULTS]
        WHERE BATCH_ID = @BatchId
        GROUP BY BATCH_ID
    ) r ON b.BATCH_ID = r.BATCH_ID
    WHERE b.BATCH_ID = @BatchId;
END
GO

-- Update delta batch status with calculated stats
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_UPDATE_DELTA_BATCH_STATS]') AND type in (N'P'))
    DROP PROCEDURE [dbo].[SP_UPDATE_DELTA_BATCH_STATS]
GO

CREATE PROCEDURE [dbo].[SP_UPDATE_DELTA_BATCH_STATS]
    @BatchId VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE b
    SET
        b.SUCCESS_COUNT = ISNULL(stats.SuccessCount, 0),
        b.ERROR_COUNT = ISNULL(stats.FailureCount, 0),
        b.PROCESSED_TOKENS = ISNULL(stats.ProcessedCount, 0),
        b.UPDATED_AT = GETUTCDATE()
    FROM [dbo].[DELTA_MIGRATION_BATCH] b
    CROSS APPLY (
        SELECT
            SUM(CASE WHEN RESULT = 'SUCCESS' THEN 1 ELSE 0 END) AS SuccessCount,
            SUM(CASE WHEN RESULT = 'FAILED' THEN 1 ELSE 0 END) AS FailureCount,
            COUNT(*) AS ProcessedCount
        FROM [dbo].[DELTA_TOKEN_RESULTS]
        WHERE BATCH_ID = @BatchId
    ) stats
    WHERE b.BATCH_ID = @BatchId;
END
GO

-- Get tokens for batch processing
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SP_GET_TOKENS_FOR_DELTA_BATCH]') AND type in (N'P'))
    DROP PROCEDURE [dbo].[SP_GET_TOKENS_FOR_DELTA_BATCH]
GO

CREATE PROCEDURE [dbo].[SP_GET_TOKENS_FOR_DELTA_BATCH]
    @FileId VARCHAR(50),
    @BatchSize INT = 500
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (@BatchSize)
        ID,
        FILE_ID,
        MONERIS_TOKEN,
        EXP_DATE,
        ENTITY_ID,
        ENTITY_TYPE,
        ENTITY_STS
    FROM [dbo].[MONERIS_TOKENS_STAGING]
    WHERE FILE_ID = @FileId
      AND VALIDATION_STATUS = 'VALID'
      AND MIGRATION_STATUS = 'PENDING'
    ORDER BY ID;
END
GO

PRINT 'Delta migration schema creation completed successfully.'
GO
