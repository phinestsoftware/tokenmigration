package com.rogers.mastercardmock.controller;

import com.opencsv.CSVReader;
import com.opencsv.CSVWriter;
import com.rogers.mastercardmock.model.BatchInfo;
import com.rogers.mastercardmock.service.BatchProcessor;
import com.rogers.mastercardmock.service.BatchStore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.StringReader;
import java.io.StringWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/batch/version/{version}/merchant/{merchantId}/batch/{batchId}")
public class BatchController {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX");

    @Autowired
    private BatchStore batchStore;

    @Autowired
    private BatchProcessor batchProcessor;

    /**
     * Submit batch (PUT /batch/version/{version}/merchant/{merchantId}/batch/{batchId})
     * Receives CSV payload with tokenization requests
     */
    @PutMapping(consumes = "text/plain", produces = "text/plain")
    public ResponseEntity<String> submitBatch(
            @PathVariable String version,
            @PathVariable String merchantId,
            @PathVariable String batchId,
            @RequestBody String csvPayload) {

        log.info("Received batch submit request. Merchant: {}, BatchId: {}", merchantId, batchId);

        try {
            // Parse CSV
            List<BatchInfo.TokenizationRecord> records = parseBatchCsv(csvPayload);

            // Create batch info
            BatchInfo batch = BatchInfo.builder()
                    .batchId(batchId)
                    .merchantId(merchantId)
                    .status("UPLOADED")
                    .totalRecords(records.size())
                    .processed(0)
                    .errors(0)
                    .uploadCompleted(LocalDateTime.now())
                    .lastAction(LocalDateTime.now())
                    .records(records)
                    .build();

            // Store batch
            batchStore.storeBatch(batch);

            // Start async processing
            batchProcessor.processBatchAsync(batch);

            log.info("Batch {} uploaded with {} records", batchId, records.size());
            return ResponseEntity.ok("Batch uploaded successfully");

        } catch (Exception e) {
            log.error("Error processing batch submit: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    /**
     * Get batch status (GET /batch/version/{version}/merchant/{merchantId}/batch/{batchId}/status)
     */
    @GetMapping(value = "/status", produces = "text/plain")
    public ResponseEntity<String> getBatchStatus(
            @PathVariable String version,
            @PathVariable String merchantId,
            @PathVariable String batchId) {

        log.info("Getting status for batch {}. Merchant: {}", batchId, merchantId);

        BatchInfo batch = batchStore.getBatch(merchantId, batchId);
        if (batch == null) {
            log.warn("Batch {} not found for merchant {}", batchId, merchantId);
            return ResponseEntity.notFound().build();
        }

        String statusCsv = generateStatusCsv(batch);
        return ResponseEntity.ok(statusCsv);
    }

    /**
     * Get batch results (GET /batch/version/{version}/merchant/{merchantId}/batch/{batchId}/response)
     */
    @GetMapping(value = "/response", produces = "text/plain")
    public ResponseEntity<String> getBatchResult(
            @PathVariable String version,
            @PathVariable String merchantId,
            @PathVariable String batchId) {

        log.info("Getting results for batch {}. Merchant: {}", batchId, merchantId);

        BatchInfo batch = batchStore.getBatch(merchantId, batchId);
        if (batch == null) {
            log.warn("Batch {} not found for merchant {}", batchId, merchantId);
            return ResponseEntity.notFound().build();
        }

        if (!"COMPLETE".equals(batch.getStatus())) {
            log.warn("Batch {} is not complete yet. Status: {}", batchId, batch.getStatus());
            return ResponseEntity.accepted().body("Batch processing not complete. Status: " + batch.getStatus());
        }

        String resultCsv = generateResultCsv(batch);
        return ResponseEntity.ok(resultCsv);
    }

    private List<BatchInfo.TokenizationRecord> parseBatchCsv(String csv) throws Exception {
        List<BatchInfo.TokenizationRecord> records = new ArrayList<>();

        try (CSVReader reader = new CSVReader(new StringReader(csv))) {
            // Skip header
            reader.readNext();

            String[] row;
            while ((row = reader.readNext()) != null) {
                if (row.length < 7) continue;

                // CSV format: apiOperation,correlationId,customer.email,sourceOfFunds.type,
                //             sourceOfFunds.provided.card.number,sourceOfFunds.provided.card.expiry.month,
                //             sourceOfFunds.provided.card.expiry.year,...
                BatchInfo.TokenizationRecord record = BatchInfo.TokenizationRecord.builder()
                        .correlationId(row[1])
                        .email(row[2])
                        .pan(row[4])
                        .expiryMonth(row[5])
                        .expiryYear(row[6])
                        .build();

                records.add(record);
            }
        }

        return records;
    }

    private String generateStatusCsv(BatchInfo batch) {
        StringWriter stringWriter = new StringWriter();
        try (CSVWriter writer = new CSVWriter(stringWriter)) {
            // Header
            writer.writeNext(new String[]{
                    "merchantId", "batchName", "totalRecords", "uploadCompleted", "batchStatus",
                    "processed", "errors", "lastAction", "processingCompleted"
            });

            // Data
            writer.writeNext(new String[]{
                    batch.getMerchantId(),
                    batch.getBatchId(),
                    String.valueOf(batch.getTotalRecords()),
                    formatDateTime(batch.getUploadCompleted()),
                    batch.getStatus(),
                    String.valueOf(batch.getProcessed()),
                    String.valueOf(batch.getErrors()),
                    formatDateTime(batch.getLastAction()),
                    batch.getProcessingCompleted() != null ? formatDateTime(batch.getProcessingCompleted()) : ""
            });
        } catch (Exception e) {
            log.error("Error generating status CSV: {}", e.getMessage());
        }
        return stringWriter.toString();
    }

    private String generateResultCsv(BatchInfo batch) {
        StringWriter stringWriter = new StringWriter();
        try (CSVWriter writer = new CSVWriter(stringWriter)) {
            // Header
            writer.writeNext(new String[]{
                    "apiOperation", "correlationId", "customer.email", "sourceOfFunds.type",
                    "sourceOfFunds.provided.card.number", "sourceOfFunds.provided.card.expiry.month",
                    "sourceOfFunds.provided.card.expiry.year", "result", "error.cause",
                    "error.explanation", "error.field", "error.supportCode", "error.validationType", "token"
            });

            // Data
            for (BatchInfo.TokenizationResult result : batch.getResults()) {
                writer.writeNext(new String[]{
                        "",  // apiOperation
                        result.getCorrelationId(),
                        result.getEmail() != null ? result.getEmail() : "",
                        "CARD",
                        result.getMaskedPan() != null ? result.getMaskedPan() : "",
                        "",  // expiryMonth
                        "",  // expiryYear
                        result.getResult(),
                        result.getErrorCause() != null ? result.getErrorCause() : "",
                        result.getErrorExplanation() != null ? result.getErrorExplanation() : "",
                        "",  // error.field
                        "",  // error.supportCode
                        "",  // error.validationType
                        result.getToken() != null ? result.getToken() : ""
                });
            }
        } catch (Exception e) {
            log.error("Error generating result CSV: {}", e.getMessage());
        }
        return stringWriter.toString();
    }

    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) return "";
        return dateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
