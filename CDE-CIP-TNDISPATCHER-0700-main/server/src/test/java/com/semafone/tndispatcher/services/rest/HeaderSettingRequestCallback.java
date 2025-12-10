package com.semafone.tndispatcher.services.rest;

import org.springframework.http.HttpHeaders;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.web.client.RequestCallback;

import java.io.IOException;
import java.util.List;
import java.util.Map;

public class HeaderSettingRequestCallback implements RequestCallback {
    final HttpHeaders requestHeaders;

    private String body;

    public HeaderSettingRequestCallback(final HttpHeaders headers) {
        this.requestHeaders = headers;
    }

    public void setBody(final String postBody) {
        this.body = postBody;
    }

    @Override
    public void doWithRequest(ClientHttpRequest request) throws IOException {
        final HttpHeaders clientHeaders = request.getHeaders();
        for (final Map.Entry<String, List<String>> entry : requestHeaders.entrySet()) {
            entry.getValue().forEach(headerVal -> clientHeaders.add(entry.getKey(), headerVal));
        }
        if (null != body) {
            request.getBody().write(body.getBytes());
        }
    }
}