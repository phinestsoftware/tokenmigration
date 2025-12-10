package com.semafone.test.rogersmoneris.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.oxm.jaxb.Jaxb2Marshaller;

import com.semafone.test.rogersmoneris.profile.MockData;
import com.semafone.test.rogersmoneris.profile.MockDataParser;
import com.semafone.test.rogersmoneris.xml.SchemaValidator;

@Configuration
public class AppConfig {
	@Autowired
	private ApplicationContext applicationContext;

	@Bean(name="monerisRequestUnmarshaller")
	public Jaxb2Marshaller monerisRequestMarshaller() {
	    Jaxb2Marshaller marshaller = new Jaxb2Marshaller();
	    marshaller.setContextPath("com.semafone.test.rogersmoneris.generated.mnrequest");
	    
	    Map<String, Object> properties = new HashMap<>();
	    properties.put(jakarta.xml.bind.Marshaller.JAXB_FORMATTED_OUTPUT, true);
	    marshaller.setMarshallerProperties(properties);
	    
	    return marshaller;
	}
	
	@Bean(name="monerisResponseMarshaller")
	public Jaxb2Marshaller moneirsResponseMarshaller() {
		Jaxb2Marshaller marshaller = new Jaxb2Marshaller();
		marshaller.setContextPath("com.semafone.test.rogersmoneris.generated.mnresponse");
		
		Map<String, Object> properties = new HashMap<>();
		properties.put(jakarta.xml.bind.Marshaller.JAXB_FORMATTED_OUTPUT, true);
		marshaller.setMarshallerProperties(properties);
		
		return marshaller;
	}
	
	@Bean(name="monerisRequestValidator")
	public SchemaValidator monerisRequestSchemaValidator() {
		SchemaValidator validator = new SchemaValidator();
		validator.loadXsd(applicationContext.getResource("classpath:mnrequest.xsd"));
		return validator;
	}
	
	@Bean
	@Autowired
	public MockData createMockData(MockDataParser mockDataParser) {
		return mockDataParser.parse(applicationContext.getResource("classpath:mockdata.csv"));
	}
}


