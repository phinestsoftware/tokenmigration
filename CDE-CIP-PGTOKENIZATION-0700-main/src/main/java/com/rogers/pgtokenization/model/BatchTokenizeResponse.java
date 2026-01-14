package com.rogers.pgtokenization.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchTokenizeResponse {

    /**
     * Batch ID
     */
    private String batchId;

    /**
     * Merchant ID
     */
    private String merchantId;

    /**
     * Total records in batch
     */
    private int totalRecords;

    /**
     * Successfully tokenized count
     */
    private int successCount;

    /**
     * Failed tokenization count
     */
    private int errorCount;

    /**
     * Batch status: SUBMITTED, PROCESSING, COMPLETE
     */
    private String status;

    /**
     * Individual results
     */
    private List<TokenizeResponse> results;
}
