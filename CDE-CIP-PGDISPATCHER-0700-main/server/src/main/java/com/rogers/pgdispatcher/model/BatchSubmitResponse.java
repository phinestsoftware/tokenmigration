package com.rogers.pgdispatcher.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchSubmitResponse {

    private String batchId;
    private String merchantId;
    private int totalRecords;
    private String status;
    private String uploadedAt;
    private String message;
}
