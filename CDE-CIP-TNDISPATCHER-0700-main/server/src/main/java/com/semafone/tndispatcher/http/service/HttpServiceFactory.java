package com.semafone.tndispatcher.http.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class HttpServiceFactory {
    public static final String APPLICATION_XML = "application/xml";

    @Autowired
    @Qualifier("customRestTemplate")
    @Lazy
    private RestTemplate restTemplate;

    public HttpService create(String contentType) {
        return new HttpService(contentType, restTemplate);
    }
}
