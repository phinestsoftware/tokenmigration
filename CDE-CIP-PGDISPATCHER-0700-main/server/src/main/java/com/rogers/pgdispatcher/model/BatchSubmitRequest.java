package com.rogers.pgdispatcher.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchSubmitRequest {

    private String batchId;
    private String merchantId;
    private List<TokenizationRecord> records;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokenizationRecord {
        private String correlationId;
        private String pan;
        private String expiryMonth;
        private String expiryYear;
        private String email;
    }
}
