package com.rogers.pgtokenization.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class PgDispatcherClient {

    @Value("${pgdispatcher.base.url}")
    private String pgDispatcherUrl;

    @Autowired
    private RestTemplate restTemplate;

    /**
     * Create a single token via PG Dispatcher
     */
    public TokenResult createToken(String merchantId, String correlationId, String pan,
                                   String expiryMonth, String expiryYear) {
        log.info("Creating PG token for correlationId: {}", correlationId);

        Map<String, String> request = Map.of(
                "merchantId", merchantId,
                "correlationId", correlationId,
                "pan", pan,
                "expiryMonth", expiryMonth != null ? expiryMonth : "",
                "expiryYear", expiryYear != null ? expiryYear : "",
                "currency", "CAD"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    pgDispatcherUrl + "/api/pg/token/create",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            return parseTokenResponse(response.getBody(), correlationId);

        } catch (Exception e) {
            log.error("Error creating PG token for {}: {}", correlationId, e.getMessage());
            return TokenResult.builder()
                    .success(false)
                    .correlationId(correlationId)
                    .errorCode("PG_ERROR")
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    /**
     * Submit a batch for tokenization
     */
    public BatchResult submitBatch(String batchId, String merchantId, List<BatchRecord> records) {
        log.info("Submitting batch {} with {} records", batchId, records.size());

        Map<String, Object> request = Map.of(
                "batchId", batchId,
                "merchantId", merchantId,
                "records", records.stream().map(r -> Map.of(
                        "correlationId", r.getCorrelationId(),
                        "pan", r.getPan(),
                        "expiryMonth", r.getExpiryMonth() != null ? r.getExpiryMonth() : "",
                        "expiryYear", r.getExpiryYear() != null ? r.getExpiryYear() : "",
                        "email", r.getEmail() != null ? r.getEmail() : ""
                )).toList()
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    pgDispatcherUrl + "/api/pg/batch/submit",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map body = response.getBody();
            return BatchResult.builder()
                    .success(true)
                    .batchId(batchId)
                    .status((String) body.get("status"))
                    .build();

        } catch (Exception e) {
            log.error("Error submitting batch {}: {}", batchId, e.getMessage());
            return BatchResult.builder()
                    .success(false)
                    .batchId(batchId)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    /**
     * Get batch status
     */
    public BatchResult getBatchStatus(String merchantId, String batchId) {
        log.info("Getting status for batch {}", batchId);

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    pgDispatcherUrl + "/api/pg/batch/status/" + batchId + "?merchantId=" + merchantId,
                    Map.class
            );

            Map body = response.getBody();
            return BatchResult.builder()
                    .success(true)
                    .batchId(batchId)
                    .status((String) body.get("batchStatus"))
                    .totalRecords((Integer) body.get("totalRecords"))
                    .processed((Integer) body.get("processed"))
                    .errors((Integer) body.get("errors"))
                    .build();

        } catch (Exception e) {
            log.error("Error getting batch status for {}: {}", batchId, e.getMessage());
            return BatchResult.builder()
                    .success(false)
                    .batchId(batchId)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    /**
     * Get batch results
     */
    public BatchResult getBatchResult(String merchantId, String batchId) {
        log.info("Getting results for batch {}", batchId);

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    pgDispatcherUrl + "/api/pg/batch/result/" + batchId + "?merchantId=" + merchantId,
                    Map.class
            );

            Map body = response.getBody();
            List<Map> results = (List<Map>) body.get("results");

            return BatchResult.builder()
                    .success(true)
                    .batchId(batchId)
                    .results(results != null ? results.stream().map(r -> TokenResult.builder()
                            .correlationId((String) r.get("correlationId"))
                            .token((String) r.get("token"))
                            .success("SUCCESS".equals(r.get("result")))
                            .maskedPan((String) r.get("maskedPan"))
                            .errorCode((String) r.get("errorCause"))
                            .errorMessage((String) r.get("errorExplanation"))
                            .build()).toList() : List.of())
                    .build();

        } catch (Exception e) {
            log.error("Error getting batch results for {}: {}", batchId, e.getMessage());
            return BatchResult.builder()
                    .success(false)
                    .batchId(batchId)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    private TokenResult parseTokenResponse(Map body, String correlationId) {
        if (body == null) {
            return TokenResult.builder()
                    .success(false)
                    .correlationId(correlationId)
                    .errorCode("NULL_RESPONSE")
                    .errorMessage("Empty response from PG Dispatcher")
                    .build();
        }

        String result = (String) body.get("result");
        if ("SUCCESS".equals(result)) {
            return TokenResult.builder()
                    .success(true)
                    .correlationId(correlationId)
                    .token((String) body.get("token"))
                    .maskedPan((String) body.get("maskedPan"))
                    .cardBrand((String) body.get("cardBrand"))
                    .fundingMethod((String) body.get("fundingMethod"))
                    .build();
        } else {
            return TokenResult.builder()
                    .success(false)
                    .correlationId(correlationId)
                    .errorCode((String) body.get("errorCause"))
                    .errorMessage((String) body.get("errorExplanation"))
                    .build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokenResult {
        private boolean success;
        private String correlationId;
        private String token;
        private String maskedPan;
        private String cardBrand;
        private String fundingMethod;
        private String errorCode;
        private String errorMessage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchRecord {
        private String correlationId;
        private String pan;
        private String expiryMonth;
        private String expiryYear;
        private String email;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchResult {
        private boolean success;
        private String batchId;
        private String status;
        private int totalRecords;
        private int processed;
        private int errors;
        private String errorMessage;
        private List<TokenResult> results;
    }
}
