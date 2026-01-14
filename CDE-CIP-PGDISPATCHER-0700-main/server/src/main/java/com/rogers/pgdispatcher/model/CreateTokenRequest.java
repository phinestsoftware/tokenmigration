package com.rogers.pgdispatcher.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTokenRequest {

    private String merchantId;
    private String correlationId;
    private String pan;
    private String expiryMonth;
    private String expiryYear;
    private String securityCode;
    private String currency;
}
