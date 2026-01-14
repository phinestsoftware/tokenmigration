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
public class BatchTokenizeRequest {

    /**
     * Unique batch ID
     */
    private String batchId;

    /**
     * Merchant ID for Mastercard API
     */
    private String merchantId;

    /**
     * List of tokens to migrate
     */
    private List<TokenRecord> records;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokenRecord {
        private String correlationId;
        private String monerisToken;
        private String expiryMonth;
        private String expiryYear;
        private String entityId;
        private String entityType;
    }
}
