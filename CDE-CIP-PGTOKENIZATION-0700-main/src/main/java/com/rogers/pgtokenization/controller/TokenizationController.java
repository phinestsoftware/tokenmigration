package com.rogers.pgtokenization.controller;

import com.rogers.pgtokenization.model.*;
import com.rogers.pgtokenization.service.TokenizationService;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/tokenization")
public class TokenizationController {

    @Autowired
    private TokenizationService tokenizationService;

    /**
     * Tokenize a single Moneris token to Mastercard token (real-time)
     * POST /api/tokenization/tokenize
     */
    @PostMapping("/tokenize")
    public ResponseEntity<TokenizeResponse> tokenize(@RequestBody TokenizeRequest request) {
        String requestId = UUID.randomUUID().toString();
        MDC.put("requestId", requestId);
        MDC.put("correlationId", request.getCorrelationId());

        try {
            log.info("Received tokenize request for monerisToken: {}",
                    maskToken(request.getMonerisToken()));

            TokenizeResponse response = tokenizationService.tokenize(request);

            log.info("Tokenize request completed. Result: {}", response.getResult());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error processing tokenize request: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(TokenizeResponse.builder()
                            .correlationId(request.getCorrelationId())
                            .monerisToken(request.getMonerisToken())
                            .result("ERROR")
                            .errorCode("SYSTEM_ERROR")
                            .errorMessage(e.getMessage())
                            .build());
        } finally {
            MDC.clear();
        }
    }

    /**
     * Batch tokenization for delta migration
     * POST /api/tokenization/batch
     */
    @PostMapping("/batch")
    public ResponseEntity<BatchTokenizeResponse> tokenizeBatch(@RequestBody BatchTokenizeRequest request) {
        String requestId = UUID.randomUUID().toString();
        MDC.put("requestId", requestId);
        MDC.put("batchId", request.getBatchId());

        try {
            log.info("Received batch tokenize request. BatchId: {}, Records: {}",
                    request.getBatchId(), request.getRecords() != null ? request.getRecords().size() : 0);

            BatchTokenizeResponse response = tokenizationService.tokenizeBatch(request);

            log.info("Batch tokenize completed. Success: {}, Errors: {}",
                    response.getSuccessCount(), response.getErrorCount());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error processing batch tokenize request: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(BatchTokenizeResponse.builder()
                            .batchId(request.getBatchId())
                            .status("ERROR")
                            .build());
        } finally {
            MDC.clear();
        }
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("PG Tokenization Service is running");
    }

    private String maskToken(String token) {
        if (token == null || token.length() < 8) return "****";
        return token.substring(0, 4) + "****" + token.substring(token.length() - 4);
    }
}
