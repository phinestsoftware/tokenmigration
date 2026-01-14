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
public class BatchResultResponse {

    private String batchId;
    private String merchantId;
    private List<TokenResult> results;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokenResult {
        private String correlationId;
        private String email;
        private String sourceOfFundsType;
        private String maskedPan;
        private String result;
        private String token;
        private String errorCause;
        private String errorExplanation;
        private String errorField;
        private String errorSupportCode;
        private String errorValidationType;
    }
}
