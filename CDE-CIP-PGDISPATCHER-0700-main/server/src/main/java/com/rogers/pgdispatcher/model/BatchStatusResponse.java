package com.rogers.pgdispatcher.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchStatusResponse {

    private String merchantId;
    private String batchId;
    private int totalRecords;
    private String uploadCompleted;
    private String batchStatus;
    private int processed;
    private int errors;
    private String lastAction;
    private String processingCompleted;
}
