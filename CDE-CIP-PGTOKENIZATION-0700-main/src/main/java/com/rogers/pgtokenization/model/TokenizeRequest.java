package com.rogers.pgtokenization.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenizeRequest {

    /**
     * Unique correlation ID for tracking
     */
    private String correlationId;

    /**
     * Moneris token (dataKey) to de-tokenize
     */
    private String monerisToken;

    /**
     * Merchant ID for Mastercard API
     */
    private String merchantId;

    /**
     * Optional expiry month (if not retrievable from Moneris)
     */
    private String expiryMonth;

    /**
     * Optional expiry year (if not retrievable from Moneris)
     */
    private String expiryYear;

    /**
     * Entity ID from billing system
     */
    private String entityId;

    /**
     * Entity type from billing system
     */
    private String entityType;
}
