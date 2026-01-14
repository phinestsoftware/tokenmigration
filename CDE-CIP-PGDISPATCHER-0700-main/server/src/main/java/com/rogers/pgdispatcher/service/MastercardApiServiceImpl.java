package com.rogers.pgdispatcher.service;

import com.rogers.pgdispatcher.constants.Constants;
import com.rogers.pgdispatcher.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
@Slf4j
public class MastercardApiServiceImpl implements MastercardApiService {

    @Value("${mastercard.api.base.url}")
    private String mastercardBaseUrl;

    @Value("${mastercard.api.version:73}")
    private String apiVersion;

    @Value("${mastercard.api.password}")
    private String apiPassword;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private CsvService csvService;

    @Override
    public BatchSubmitResponse submitBatch(BatchSubmitRequest request) {
        log.info("Submitting batch {} with {} records", request.getBatchId(), request.getRecords().size());

        String url = String.format("%s/batch/version/%s/merchant/%s/batch/%s",
                mastercardBaseUrl, apiVersion, request.getMerchantId(), request.getBatchId());

        // Convert request to CSV format
        String csvPayload = csvService.createBatchCsv(request.getRecords());

        HttpHeaders headers = createHeaders(request.getMerchantId());
        headers.setContentType(MediaType.parseMediaType("text/plain; charset=UTF-8"));

        HttpEntity<String> entity = new HttpEntity<>(csvPayload, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);

            log.info("Batch {} submitted successfully", request.getBatchId());

            return BatchSubmitResponse.builder()
                    .batchId(request.getBatchId())
                    .merchantId(request.getMerchantId())
                    .totalRecords(request.getRecords().size())
                    .status(Constants.BATCH_STATUS_UPLOADED)
                    .message("Batch submitted successfully")
                    .build();

        } catch (Exception e) {
            log.error("Error submitting batch {}: {}", request.getBatchId(), e.getMessage());
            throw new RuntimeException("Failed to submit batch: " + e.getMessage(), e);
        }
    }

    @Override
    public BatchStatusResponse getBatchStatus(String merchantId, String batchId) {
        log.info("Getting status for batch {}", batchId);

        String url = String.format("%s/batch/version/%s/merchant/%s/batch/%s/status",
                mastercardBaseUrl, apiVersion, merchantId, batchId);

        HttpHeaders headers = createHeaders(merchantId);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return csvService.parseBatchStatusCsv(response.getBody());

        } catch (Exception e) {
            log.error("Error getting batch status for {}: {}", batchId, e.getMessage());
            throw new RuntimeException("Failed to get batch status: " + e.getMessage(), e);
        }
    }

    @Override
    public BatchResultResponse getBatchResult(String merchantId, String batchId) {
        log.info("Getting results for batch {}", batchId);

        String url = String.format("%s/batch/version/%s/merchant/%s/batch/%s/response",
                mastercardBaseUrl, apiVersion, merchantId, batchId);

        HttpHeaders headers = createHeaders(merchantId);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            BatchResultResponse result = csvService.parseBatchResultCsv(response.getBody());
            result.setBatchId(batchId);
            result.setMerchantId(merchantId);
            return result;

        } catch (Exception e) {
            log.error("Error getting batch results for {}: {}", batchId, e.getMessage());
            throw new RuntimeException("Failed to get batch results: " + e.getMessage(), e);
        }
    }

    @Override
    public CreateTokenResponse createToken(CreateTokenRequest request) {
        log.info("Creating token for correlation ID {}", request.getCorrelationId());

        String url = String.format("%s/api/rest/version/%s/merchant/%s/token",
                mastercardBaseUrl, apiVersion, request.getMerchantId());

        HttpHeaders headers = createHeaders(request.getMerchantId());
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Build the JSON payload for real-time tokenization
        String jsonPayload = buildTokenizePayload(request);

        HttpEntity<String> entity = new HttpEntity<>(jsonPayload, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            return parseTokenResponse(response.getBody(), request.getCorrelationId());

        } catch (Exception e) {
            log.error("Error creating token for {}: {}", request.getCorrelationId(), e.getMessage());
            return CreateTokenResponse.builder()
                    .correlationId(request.getCorrelationId())
                    .result(Constants.RESULT_ERROR)
                    .errorCause("API_ERROR")
                    .errorExplanation(e.getMessage())
                    .build();
        }
    }

    private HttpHeaders createHeaders(String merchantId) {
        HttpHeaders headers = new HttpHeaders();
        String auth = "merchant." + merchantId + ":" + apiPassword;
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
        headers.set("Authorization", "Basic " + encodedAuth);
        return headers;
    }

    private String buildTokenizePayload(CreateTokenRequest request) {
        return String.format("""
                {
                    "transaction": {
                        "currency": "%s"
                    },
                    "sourceOfFunds": {
                        "type": "CARD",
                        "provided": {
                            "card": {
                                "number": "%s",
                                "securityCode": "%s",
                                "expiry": {
                                    "month": "%s",
                                    "year": "%s"
                                }
                            }
                        }
                    }
                }
                """,
                request.getCurrency() != null ? request.getCurrency() : "CAD",
                request.getPan(),
                request.getSecurityCode() != null ? request.getSecurityCode() : "",
                request.getExpiryMonth(),
                request.getExpiryYear());
    }

    private CreateTokenResponse parseTokenResponse(String responseBody, String correlationId) {
        // Simple JSON parsing - in production use Jackson ObjectMapper
        try {
            if (responseBody.contains("\"token\"")) {
                String token = extractJsonValue(responseBody, "token");
                return CreateTokenResponse.builder()
                        .correlationId(correlationId)
                        .token(token)
                        .result(Constants.RESULT_SUCCESS)
                        .build();
            } else {
                return CreateTokenResponse.builder()
                        .correlationId(correlationId)
                        .result(Constants.RESULT_ERROR)
                        .errorExplanation("Token not found in response")
                        .build();
            }
        } catch (Exception e) {
            return CreateTokenResponse.builder()
                    .correlationId(correlationId)
                    .result(Constants.RESULT_ERROR)
                    .errorExplanation("Failed to parse response: " + e.getMessage())
                    .build();
        }
    }

    private String extractJsonValue(String json, String key) {
        int keyIndex = json.indexOf("\"" + key + "\"");
        if (keyIndex == -1) return null;

        int colonIndex = json.indexOf(":", keyIndex);
        int startQuote = json.indexOf("\"", colonIndex);
        int endQuote = json.indexOf("\"", startQuote + 1);

        return json.substring(startQuote + 1, endQuote);
    }
}
