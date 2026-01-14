package com.rogers.mastercardmock.service;

import com.rogers.mastercardmock.model.BatchInfo;
import com.rogers.mastercardmock.profile.CardProfile;
import com.rogers.mastercardmock.profile.MockData;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class BatchProcessor {

    @Autowired
    private MockData mockData;

    @Autowired
    private BatchStore batchStore;

    @Value("${mock.batch.processing.delay.ms:2000}")
    private long processingDelayMs;

    /**
     * Process a batch asynchronously (simulates Mastercard processing)
     */
    @Async
    public void processBatchAsync(BatchInfo batch) {
        log.info("Starting async processing of batch {} with {} records",
                batch.getBatchId(), batch.getTotalRecords());

        // Update status to PROCESSING
        batch.setStatus("PROCESSING");
        batch.setLastAction(LocalDateTime.now());
        batchStore.updateBatch(batch);

        // Simulate processing delay
        try {
            Thread.sleep(processingDelayMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Batch processing interrupted for batch {}", batch.getBatchId());
            return;
        }

        // Process each record
        List<BatchInfo.TokenizationResult> results = new ArrayList<>();
        int errors = 0;

        for (BatchInfo.TokenizationRecord record : batch.getRecords()) {
            BatchInfo.TokenizationResult result = processRecord(record);
            results.add(result);

            if (!"SUCCESS".equals(result.getResult())) {
                errors++;
            }
        }

        // Update batch with results
        batch.setResults(results);
        batch.setProcessed(batch.getTotalRecords());
        batch.setErrors(errors);
        batch.setStatus("COMPLETE");
        batch.setLastAction(LocalDateTime.now());
        batch.setProcessingCompleted(LocalDateTime.now());
        batchStore.updateBatch(batch);

        log.info("Completed processing batch {}. Total: {}, Errors: {}",
                batch.getBatchId(), batch.getTotalRecords(), errors);
    }

    private BatchInfo.TokenizationResult processRecord(BatchInfo.TokenizationRecord record) {
        try {
            CardProfile profile = mockData.tokenize(record.getPan());

            if ("SUCCESS".equals(profile.getResponseCode())) {
                return BatchInfo.TokenizationResult.builder()
                        .correlationId(record.getCorrelationId())
                        .email(record.getEmail())
                        .maskedPan(profile.getMaskedPan())
                        .result("SUCCESS")
                        .token(profile.getToken())
                        .build();
            } else {
                return BatchInfo.TokenizationResult.builder()
                        .correlationId(record.getCorrelationId())
                        .email(record.getEmail())
                        .maskedPan(profile.getMaskedPan())
                        .result("ERROR")
                        .errorCause(profile.getErrorCause())
                        .errorExplanation(profile.getErrorExplanation())
                        .build();
            }
        } catch (Exception e) {
            log.error("Error processing record {}: {}", record.getCorrelationId(), e.getMessage());
            return BatchInfo.TokenizationResult.builder()
                    .correlationId(record.getCorrelationId())
                    .email(record.getEmail())
                    .result("ERROR")
                    .errorCause("SYSTEM_ERROR")
                    .errorExplanation(e.getMessage())
                    .build();
        }
    }
}
