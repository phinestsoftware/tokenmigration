package com.rogers.cashintegration.bpsservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.integration.annotation.IntegrationComponentScan;
import org.springframework.integration.config.EnableIntegration;

@EnableIntegration
@IntegrationComponentScan
@SpringBootApplication
public class BpsServiceApplication {

	public static void main(String[] args) {
		try {
		SpringApplication.run(BpsServiceApplication.class, args);
		}catch(Exception e) {
			e.printStackTrace();
		}
	}

}
