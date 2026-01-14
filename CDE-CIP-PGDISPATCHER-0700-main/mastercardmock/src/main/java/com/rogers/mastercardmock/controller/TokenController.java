package com.rogers.mastercardmock.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.rogers.mastercardmock.profile.CardProfile;
import com.rogers.mastercardmock.profile.MockData;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/rest/version/{version}/merchant/{merchantId}/token")
public class TokenController {

    @Autowired
    private MockData mockData;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Create token (POST /api/rest/version/{version}/merchant/{merchantId}/token)
     * Real-time single token creation
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> createToken(
            @PathVariable String version,
            @PathVariable String merchantId,
            @RequestBody String requestBody) {

        log.info("Received create token request. Merchant: {}", merchantId);

        try {
            JsonNode request = objectMapper.readTree(requestBody);

            // Extract PAN from request
            String pan = extractPan(request);
            if (pan == null || pan.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("INVALID_REQUEST", "Card number is required"));
            }

            // Tokenize
            CardProfile profile = mockData.tokenize(pan);

            if ("SUCCESS".equals(profile.getResponseCode())) {
                log.info("Token created successfully for merchant {}", merchantId);
                return ResponseEntity.ok(createSuccessResponse(profile));
            } else {
                log.warn("Token creation failed: {}", profile.getErrorCause());
                return ResponseEntity.ok(createErrorResponse(profile.getErrorCause(), profile.getErrorExplanation()));
            }

        } catch (Exception e) {
            log.error("Error creating token: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(createErrorResponse("SYSTEM_ERROR", e.getMessage()));
        }
    }

    private String extractPan(JsonNode request) {
        JsonNode sourceOfFunds = request.get("sourceOfFunds");
        if (sourceOfFunds != null) {
            JsonNode provided = sourceOfFunds.get("provided");
            if (provided != null) {
                JsonNode card = provided.get("card");
                if (card != null) {
                    JsonNode number = card.get("number");
                    if (number != null) {
                        return number.asText();
                    }
                }
            }
        }
        return null;
    }

    private String createSuccessResponse(CardProfile profile) {
        try {
            ObjectNode response = objectMapper.createObjectNode();
            response.put("result", "SUCCESS");
            response.put("token", profile.getToken());

            ObjectNode sourceOfFunds = objectMapper.createObjectNode();
            sourceOfFunds.put("type", "CARD");

            ObjectNode provided = objectMapper.createObjectNode();
            ObjectNode card = objectMapper.createObjectNode();
            card.put("brand", profile.getCardBrand());
            card.put("fundingMethod", profile.getFundingMethod());
            card.put("number", profile.getMaskedPan());
            provided.set("card", card);
            sourceOfFunds.set("provided", provided);

            response.set("sourceOfFunds", sourceOfFunds);

            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            return "{\"result\":\"SUCCESS\",\"token\":\"" + profile.getToken() + "\"}";
        }
    }

    private String createErrorResponse(String cause, String explanation) {
        try {
            ObjectNode response = objectMapper.createObjectNode();
            response.put("result", "ERROR");

            ObjectNode error = objectMapper.createObjectNode();
            error.put("cause", cause);
            error.put("explanation", explanation);
            response.set("error", error);

            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            return "{\"result\":\"ERROR\",\"error\":{\"cause\":\"" + cause + "\"}}";
        }
    }
}
