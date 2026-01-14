package com.rogers.pgdispatcher.controller;

import com.rogers.pgdispatcher.constants.Constants;
import com.rogers.pgdispatcher.model.*;
import com.rogers.pgdispatcher.service.MastercardApiService;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping(Constants.API_BASE)
public class PgDispatcherController {

    @Autowired
    private MastercardApiService mastercardApiService;

    /**
     * Submit a batch of tokenization requests
     * POST /api/pg/batch/submit
     */
    @PostMapping(Constants.BATCH_PATH + Constants.SUBMIT_BATCH)
    public ResponseEntity<BatchSubmitResponse> submitBatch(@RequestBody BatchSubmitRequest request) {
        MDC.put("pgRequestId", UUID.randomUUID().toString());
        MDC.put("batchId", request.getBatchId());

        try {
            log.info("Received batch submit request for batch {}", request.getBatchId());
            BatchSubmitResponse response = mastercardApiService.submitBatch(request);
            log.info("Batch {} submitted successfully", request.getBatchId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error processing batch submit: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(BatchSubmitResponse.builder()
                            .batchId(request.getBatchId())
                            .status("FAILED")
                            .message(e.getMessage())
                            .build());
        } finally {
            MDC.clear();
        }
    }

    /**
     * Get the status of a batch
     * GET /api/pg/batch/status/{batchId}?merchantId=xxx
     */
    @GetMapping(Constants.BATCH_PATH + Constants.BATCH_STATUS)
    public ResponseEntity<BatchStatusResponse> getBatchStatus(
            @PathVariable String batchId,
            @RequestParam String merchantId) {
        MDC.put("pgRequestId", UUID.randomUUID().toString());
        MDC.put("batchId", batchId);

        try {
            log.info("Received batch status request for batch {}", batchId);
            BatchStatusResponse response = mastercardApiService.getBatchStatus(merchantId, batchId);
            log.info("Batch {} status: {}", batchId, response.getBatchStatus());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting batch status: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(BatchStatusResponse.builder()
                            .batchId(batchId)
                            .batchStatus("ERROR")
                            .build());
        } finally {
            MDC.clear();
        }
    }

    /**
     * Get the results of a completed batch
     * GET /api/pg/batch/result/{batchId}?merchantId=xxx
     */
    @GetMapping(Constants.BATCH_PATH + Constants.BATCH_RESULT)
    public ResponseEntity<BatchResultResponse> getBatchResult(
            @PathVariable String batchId,
            @RequestParam String merchantId) {
        MDC.put("pgRequestId", UUID.randomUUID().toString());
        MDC.put("batchId", batchId);

        try {
            log.info("Received batch result request for batch {}", batchId);
            BatchResultResponse response = mastercardApiService.getBatchResult(merchantId, batchId);
            log.info("Batch {} results retrieved, {} records", batchId, response.getResults().size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting batch results: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        } finally {
            MDC.clear();
        }
    }

    /**
     * Create a single token in real-time
     * POST /api/pg/token/create
     */
    @PostMapping(Constants.TOKEN_PATH + Constants.CREATE_TOKEN)
    public ResponseEntity<CreateTokenResponse> createToken(@RequestBody CreateTokenRequest request) {
        MDC.put("pgRequestId", UUID.randomUUID().toString());
        MDC.put("correlationId", request.getCorrelationId());

        try {
            log.info("Received create token request for correlation ID {}", request.getCorrelationId());
            CreateTokenResponse response = mastercardApiService.createToken(request);
            log.info("Token creation result for {}: {}", request.getCorrelationId(), response.getResult());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error creating token: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(CreateTokenResponse.builder()
                            .correlationId(request.getCorrelationId())
                            .result(Constants.RESULT_ERROR)
                            .errorExplanation(e.getMessage())
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
        return ResponseEntity.ok("PG Dispatcher is running");
    }
}
