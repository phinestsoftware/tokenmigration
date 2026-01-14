package com.rogers.pgdispatcher.service;

import com.rogers.pgdispatcher.model.*;

public interface MastercardApiService {

    /**
     * Submit a batch of tokenization requests to Mastercard
     */
    BatchSubmitResponse submitBatch(BatchSubmitRequest request);

    /**
     * Get the status of a batch
     */
    BatchStatusResponse getBatchStatus(String merchantId, String batchId);

    /**
     * Get the results of a completed batch
     */
    BatchResultResponse getBatchResult(String merchantId, String batchId);

    /**
     * Create a single token in real-time
     */
    CreateTokenResponse createToken(CreateTokenRequest request);
}
