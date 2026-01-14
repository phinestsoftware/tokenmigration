package com.rogers.pgdispatcher.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTokenResponse {

    private String correlationId;
    private String token;
    private String result;
    private String maskedPan;
    private String cardBrand;
    private String fundingMethod;
    private String expiryMonth;
    private String expiryYear;
    private String errorCause;
    private String errorExplanation;
}
