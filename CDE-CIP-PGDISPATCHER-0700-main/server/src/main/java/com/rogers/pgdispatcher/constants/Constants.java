package com.rogers.pgdispatcher.constants;

public final class Constants {

    private Constants() {
        // Utility class
    }

    // API Paths
    public static final String API_BASE = "/api/pg";
    public static final String BATCH_PATH = "/batch";
    public static final String TOKEN_PATH = "/token";

    // Batch Operations
    public static final String SUBMIT_BATCH = "/submit";
    public static final String BATCH_STATUS = "/status/{batchId}";
    public static final String BATCH_RESULT = "/result/{batchId}";

    // Token Operations
    public static final String CREATE_TOKEN = "/create";

    // Batch Status Values
    public static final String BATCH_STATUS_UPLOADED = "UPLOADED";
    public static final String BATCH_STATUS_PROCESSING = "PROCESSING";
    public static final String BATCH_STATUS_COMPLETE = "COMPLETE";
    public static final String BATCH_STATUS_FAILED = "FAILED";

    // Result Status Values
    public static final String RESULT_SUCCESS = "SUCCESS";
    public static final String RESULT_ERROR = "ERROR";

    // CSV Headers for Mastercard Batch
    public static final String[] BATCH_INPUT_HEADERS = {
        "apiOperation", "correlationId", "customer.email", "sourceOfFunds.type",
        "sourceOfFunds.provided.card.number", "sourceOfFunds.provided.card.expiry.month",
        "sourceOfFunds.provided.card.expiry.year", "result", "error.cause",
        "error.explanation", "error.field", "error.supportCode", "error.validationType", "token"
    };

    public static final String[] BATCH_STATUS_HEADERS = {
        "merchantId", "batchName", "totalRecords", "uploadCompleted", "batchStatus",
        "processed", "errors", "lastAction", "processingCompleted"
    };
}
