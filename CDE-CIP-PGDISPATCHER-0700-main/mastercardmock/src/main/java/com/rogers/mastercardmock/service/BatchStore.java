package com.rogers.mastercardmock.service;

import com.rogers.mastercardmock.model.BatchInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class BatchStore {

    private final Map<String, BatchInfo> batches = new ConcurrentHashMap<>();

    public void storeBatch(BatchInfo batch) {
        String key = batch.getMerchantId() + ":" + batch.getBatchId();
        batches.put(key, batch);
        log.debug("Stored batch {} for merchant {}", batch.getBatchId(), batch.getMerchantId());
    }

    public BatchInfo getBatch(String merchantId, String batchId) {
        String key = merchantId + ":" + batchId;
        return batches.get(key);
    }

    public void updateBatch(BatchInfo batch) {
        storeBatch(batch);
    }

    public void removeBatch(String merchantId, String batchId) {
        String key = merchantId + ":" + batchId;
        batches.remove(key);
    }
}
