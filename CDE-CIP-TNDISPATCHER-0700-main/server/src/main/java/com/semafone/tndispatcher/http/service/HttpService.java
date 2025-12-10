package com.semafone.tndispatcher.http.service;

import com.google.common.base.Throwables;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.Map;

/**
 * Helper class for doing HTTP calls.
 */
@AllArgsConstructor
public class HttpService {

    private String contentType;
    private RestTemplate restTemplate;

    /**
     * Executes HTTP POST request.
     */
    public <T, V> T executePost(String url, V xmlBody, Class<T> responseType) {
        return executePost(url, Collections.emptyMap(), xmlBody, responseType);
    }

    /**
     * Executes HTTP POST request.
     */
    private <T, V> T executePost(String url, Map<String, String> headers, V requestBody, Class<T> responseType) {
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.add("Accept", contentType);
        httpHeaders.add("Content-Type", contentType);
        headers.entrySet().forEach(e->httpHeaders.add(e.getKey(),e.getValue()));

        return executeRequest(url, HttpMethod.POST, new HttpEntity<V>(requestBody, httpHeaders), responseType);
    }

    private <T, V> T executeRequest(String url, HttpMethod httpMethod, HttpEntity<V> entity, Class<T> responseType) {
        try {
            ResponseEntity<T> response = restTemplate.exchange(url, httpMethod, entity, responseType);
            return response.getBody();
        } catch (Exception rethrow) {
            throw Throwables.propagate(rethrow);
        }
    }
}
