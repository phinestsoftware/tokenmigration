package com.semafone.tndispatcher.config;

import com.semafone.tndispatcher.utils.XsdValidation;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name="semafone.schema.validation.disabled")
public class NoOpValidationConfig {

    @Bean(name = "csRequestValidator")
    public XsdValidation getCsRquestSchemaNoOpValidator() {
        return new XsdValidation.NoOpXsdValidation();
    }

    @Bean(name = "mnRequestValidator")
    public XsdValidation getMnRequestSchemaNoOpValidator(){
        return new XsdValidation.NoOpXsdValidation();
    }

    @Bean(name = "mnResponseValidator")
    public XsdValidation getMnResponseSchemaNoOpValidator(){
        return new XsdValidation.NoOpXsdValidation();
    }
}
