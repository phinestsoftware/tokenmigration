package com.rogers.cashintegration.tsiservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

@SpringBootApplication
public class TSIServiceApplication extends SpringBootServletInitializer {

	public static void main(String[] args) {
		SpringApplication.run(TSIServiceApplication.class, args);
	}

	@Override
	protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
		return application.sources(TSIServiceApplication.class);
	}
}
