package com.rogers.pgtokenization.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenizeResponse {

    /**
     * Correlation ID from request
     */
    private String correlationId;

    /**
     * Original Moneris token
     */
    private String monerisToken;

    /**
     * New Mastercard (PG) token
     */
    private String pgToken;

    /**
     * Overall result: SUCCESS or ERROR
     */
    private String result;

    /**
     * Masked PAN (first 6 + last 4)
     */
    private String maskedPan;

    /**
     * Card brand (VISA, MASTERCARD, AMEX, etc.)
     */
    private String cardBrand;

    /**
     * Funding method (CREDIT, DEBIT)
     */
    private String fundingMethod;

    /**
     * First 6 digits of PAN
     */
    private String firstSix;

    /**
     * Last 4 digits of PAN
     */
    private String lastFour;

    /**
     * Expiry month
     */
    private String expiryMonth;

    /**
     * Expiry year
     */
    private String expiryYear;

    /**
     * Error code if failed
     */
    private String errorCode;

    /**
     * Error message if failed
     */
    private String errorMessage;

    /**
     * Which step failed: MONERIS_LOOKUP, MASTERCARD_TOKENIZE, or null if success
     */
    private String failedStep;
}
