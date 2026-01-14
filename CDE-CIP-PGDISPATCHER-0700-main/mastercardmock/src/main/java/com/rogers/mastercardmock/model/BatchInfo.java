package com.rogers.mastercardmock.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchInfo {

    private String batchId;
    private String merchantId;
    private String status;
    private int totalRecords;
    private int processed;
    private int errors;
    private LocalDateTime uploadCompleted;
    private LocalDateTime lastAction;
    private LocalDateTime processingCompleted;
    private List<TokenizationRecord> records;
    private List<TokenizationResult> results;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokenizationRecord {
        private String correlationId;
        private String email;
        private String pan;
        private String expiryMonth;
        private String expiryYear;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokenizationResult {
        private String correlationId;
        private String email;
        private String maskedPan;
        private String result;
        private String token;
        private String errorCause;
        private String errorExplanation;
    }
}
