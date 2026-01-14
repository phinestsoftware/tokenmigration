package com.rogers.pgtokenization.service;

import com.rogers.pgtokenization.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class TokenizationService {

    @Autowired
    private TnDispatcherClient tnDispatcherClient;

    @Autowired
    private PgDispatcherClient pgDispatcherClient;

    /**
     * Tokenize a single Moneris token to Mastercard token.
     * Flow: Moneris Token → TNDispatcher (get PAN) → PGDispatcher (create MC token)
     */
    public TokenizeResponse tokenize(TokenizeRequest request) {
        String correlationId = request.getCorrelationId() != null ?
                request.getCorrelationId() : UUID.randomUUID().toString();

        log.info("Starting tokenization for correlationId: {}, monerisToken: {}",
                correlationId, maskToken(request.getMonerisToken()));

        // Step 1: Get PAN from Moneris via TNDispatcher
        TnDispatcherClient.LookupResult lookupResult = tnDispatcherClient.lookupPan(request.getMonerisToken());

        if (!lookupResult.isSuccess()) {
            log.warn("Moneris lookup failed for {}: {}", correlationId, lookupResult.getErrorMessage());
            return TokenizeResponse.builder()
                    .correlationId(correlationId)
                    .monerisToken(request.getMonerisToken())
                    .result("ERROR")
                    .failedStep("MONERIS_LOOKUP")
                    .errorCode(lookupResult.getErrorCode())
                    .errorMessage(lookupResult.getErrorMessage())
                    .build();
        }

        log.debug("Moneris lookup successful for {}, card type: {}", correlationId, lookupResult.getCardType());

        // Determine expiry - use request values if provided, otherwise use values from Moneris
        String expiryMonth = request.getExpiryMonth() != null ? request.getExpiryMonth() : lookupResult.getExpiryMonth();
        String expiryYear = request.getExpiryYear() != null ? request.getExpiryYear() : lookupResult.getExpiryYear();

        // Step 2: Create Mastercard token via PGDispatcher
        PgDispatcherClient.TokenResult tokenResult = pgDispatcherClient.createToken(
                request.getMerchantId(),
                correlationId,
                lookupResult.getPan(),
                expiryMonth,
                expiryYear
        );

        if (!tokenResult.isSuccess()) {
            log.warn("Mastercard tokenization failed for {}: {}", correlationId, tokenResult.getErrorMessage());
            return TokenizeResponse.builder()
                    .correlationId(correlationId)
                    .monerisToken(request.getMonerisToken())
                    .result("ERROR")
                    .failedStep("MASTERCARD_TOKENIZE")
                    .maskedPan(lookupResult.getMaskedPan())
                    .firstSix(lookupResult.getFirstSix())
                    .lastFour(lookupResult.getLastFour())
                    .errorCode(tokenResult.getErrorCode())
                    .errorMessage(tokenResult.getErrorMessage())
                    .build();
        }

        log.info("Tokenization successful for {}, pgToken: {}", correlationId, maskToken(tokenResult.getToken()));

        return TokenizeResponse.builder()
                .correlationId(correlationId)
                .monerisToken(request.getMonerisToken())
                .pgToken(tokenResult.getToken())
                .result("SUCCESS")
                .maskedPan(lookupResult.getMaskedPan())
                .cardBrand(determineCardBrand(lookupResult.getCardType(), tokenResult.getCardBrand()))
                .fundingMethod(tokenResult.getFundingMethod())
                .firstSix(lookupResult.getFirstSix())
                .lastFour(lookupResult.getLastFour())
                .expiryMonth(expiryMonth)
                .expiryYear(expiryYear)
                .build();
    }

    /**
     * Batch tokenization for delta migration.
     * Processes each token individually through TNDispatcher → PGDispatcher flow.
     */
    public BatchTokenizeResponse tokenizeBatch(BatchTokenizeRequest request) {
        String batchId = request.getBatchId() != null ? request.getBatchId() : UUID.randomUUID().toString();

        log.info("Starting batch tokenization for batchId: {}, records: {}",
                batchId, request.getRecords().size());

        List<TokenizeResponse> results = new ArrayList<>();
        int successCount = 0;
        int errorCount = 0;

        for (BatchTokenizeRequest.TokenRecord record : request.getRecords()) {
            TokenizeRequest tokenizeRequest = TokenizeRequest.builder()
                    .correlationId(record.getCorrelationId())
                    .monerisToken(record.getMonerisToken())
                    .merchantId(request.getMerchantId())
                    .expiryMonth(record.getExpiryMonth())
                    .expiryYear(record.getExpiryYear())
                    .entityId(record.getEntityId())
                    .entityType(record.getEntityType())
                    .build();

            TokenizeResponse response = tokenize(tokenizeRequest);
            results.add(response);

            if ("SUCCESS".equals(response.getResult())) {
                successCount++;
            } else {
                errorCount++;
            }
        }

        log.info("Batch {} completed. Total: {}, Success: {}, Errors: {}",
                batchId, request.getRecords().size(), successCount, errorCount);

        return BatchTokenizeResponse.builder()
                .batchId(batchId)
                .merchantId(request.getMerchantId())
                .totalRecords(request.getRecords().size())
                .successCount(successCount)
                .errorCount(errorCount)
                .status("COMPLETE")
                .results(results)
                .build();
    }

    private String determineCardBrand(String monerisCardType, String pgCardBrand) {
        // Prefer PG card brand if available
        if (pgCardBrand != null && !pgCardBrand.isEmpty()) {
            return pgCardBrand;
        }

        // Map Moneris card types
        if (monerisCardType == null) return "UNKNOWN";

        return switch (monerisCardType.toUpperCase()) {
            case "V", "VISA" -> "VISA";
            case "M", "MC", "MASTERCARD" -> "MASTERCARD";
            case "AX", "AMEX" -> "AMEX";
            case "D", "DISCOVER" -> "DISCOVER";
            default -> monerisCardType;
        };
    }

    private String maskToken(String token) {
        if (token == null || token.length() < 8) return "****";
        return token.substring(0, 4) + "****" + token.substring(token.length() - 4);
    }
}
