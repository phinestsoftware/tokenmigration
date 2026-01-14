package com.rogers.pgdispatcher.service;

import com.opencsv.CSVReader;
import com.opencsv.CSVWriter;
import com.rogers.pgdispatcher.constants.Constants;
import com.rogers.pgdispatcher.model.BatchResultResponse;
import com.rogers.pgdispatcher.model.BatchStatusResponse;
import com.rogers.pgdispatcher.model.BatchSubmitRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.StringReader;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class CsvService {

    /**
     * Create CSV payload for batch tokenization request
     */
    public String createBatchCsv(List<BatchSubmitRequest.TokenizationRecord> records) {
        StringWriter stringWriter = new StringWriter();
        try (CSVWriter writer = new CSVWriter(stringWriter)) {
            // Write header
            writer.writeNext(Constants.BATCH_INPUT_HEADERS);

            // Write records
            for (BatchSubmitRequest.TokenizationRecord record : records) {
                String[] row = new String[]{
                        "TOKENIZE",
                        record.getCorrelationId(),
                        record.getEmail() != null ? record.getEmail() : "",
                        "CARD",
                        record.getPan(),
                        record.getExpiryMonth(),
                        record.getExpiryYear(),
                        "", "", "", "", "", "", ""  // Empty result fields for input
                };
                writer.writeNext(row);
            }
        } catch (Exception e) {
            log.error("Error creating batch CSV: {}", e.getMessage());
            throw new RuntimeException("Failed to create batch CSV", e);
        }

        return stringWriter.toString();
    }

    /**
     * Parse batch status CSV response
     */
    public BatchStatusResponse parseBatchStatusCsv(String csv) {
        try (CSVReader reader = new CSVReader(new StringReader(csv))) {
            // Skip header
            reader.readNext();
            // Read data row
            String[] row = reader.readNext();

            if (row == null || row.length < 9) {
                throw new RuntimeException("Invalid batch status CSV format");
            }

            return BatchStatusResponse.builder()
                    .merchantId(row[0])
                    .batchId(row[1])
                    .totalRecords(parseIntSafe(row[2]))
                    .uploadCompleted(row[3])
                    .batchStatus(row[4])
                    .processed(parseIntSafe(row[5]))
                    .errors(parseIntSafe(row[6]))
                    .lastAction(row[7])
                    .processingCompleted(row.length > 8 ? row[8] : "")
                    .build();

        } catch (Exception e) {
            log.error("Error parsing batch status CSV: {}", e.getMessage());
            throw new RuntimeException("Failed to parse batch status CSV", e);
        }
    }

    /**
     * Parse batch result CSV response
     */
    public BatchResultResponse parseBatchResultCsv(String csv) {
        List<BatchResultResponse.TokenResult> results = new ArrayList<>();

        try (CSVReader reader = new CSVReader(new StringReader(csv))) {
            // Skip header
            reader.readNext();

            String[] row;
            while ((row = reader.readNext()) != null) {
                if (row.length < 14) continue;

                BatchResultResponse.TokenResult result = BatchResultResponse.TokenResult.builder()
                        .correlationId(row[1])
                        .email(row[2])
                        .sourceOfFundsType(row[3])
                        .maskedPan(row[4])
                        .result(row[7])
                        .errorCause(row[8])
                        .errorExplanation(row[9])
                        .errorField(row[10])
                        .errorSupportCode(row[11])
                        .errorValidationType(row[12])
                        .token(row[13])
                        .build();

                results.add(result);
            }

        } catch (Exception e) {
            log.error("Error parsing batch result CSV: {}", e.getMessage());
            throw new RuntimeException("Failed to parse batch result CSV", e);
        }

        return BatchResultResponse.builder()
                .results(results)
                .build();
    }

    private int parseIntSafe(String value) {
        try {
            return value != null && !value.isEmpty() ? Integer.parseInt(value) : 0;
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
