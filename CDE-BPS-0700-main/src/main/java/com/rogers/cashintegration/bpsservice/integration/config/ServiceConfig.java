package com.rogers.cashintegration.bpsservice.integration.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Created by Bhagyashri.Paramane on 2023-12-01
 *
 * @author : Bhagyashri Paramane
 * @date : 2024-02-15
 * @project :bps-service
 **/


@Configuration
public class ServiceConfig {
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder restTemplate) {
        return restTemplate.build();
    }
}
