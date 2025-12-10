package com.semafone.tndispatcher.config;

import com.semafone.tndispatcher.utils.XsdValidation;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@ConditionalOnProperty(name="semafone.schema.validation.disabled",havingValue = "false",matchIfMissing = true)
public class ValidationConfig {

    @Autowired
    private CsSchemas csSchemas;

    @Autowired
    private MnRequestSchemas mnRequestSchemas;

    @Autowired
    private MnResponseSchemas mnResponseSchemas;

    @Value("${semafone.vault.provider}")
    private String vaultProvider;

    @Bean(name = "csRequestValidator")
    public XsdValidation getCsRquestSchemaValidator(){
    	return new XsdValidation(csSchemas.getSchemas());
    }

    @Bean(name = "mnRequestValidator")
    public XsdValidation getMnRequestSchemaValidator(){
    	return new XsdValidation(mnRequestSchemas.getSchemas());
    }
    
    @Bean(name = "mnResponseValidator")
    public XsdValidation getMnResponseSchemaValidator(){
    	return new XsdValidation(mnResponseSchemas.getSchemas());
    }

    @Configuration
    @ConfigurationProperties(prefix = "util.cybersource.xsd")
    public static class CsSchemas extends SchemaList{
    }

    @Configuration
    @ConfigurationProperties(prefix = "util.moneris.xsd.request")
    public static class MnRequestSchemas extends SchemaList{
    }

    @Configuration
    @ConfigurationProperties(prefix = "util.moneris.xsd.response")
    public static class MnResponseSchemas extends SchemaList{
    }

    @Data
    public static class SchemaList {
        protected List<String> schemas;
    }
}
