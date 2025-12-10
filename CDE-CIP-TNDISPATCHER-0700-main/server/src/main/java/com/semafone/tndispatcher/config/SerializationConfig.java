package com.semafone.tndispatcher.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.dataformat.xml.JacksonXmlModule;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import lombok.Getter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

/**
 * Spring Configuration to define objectMapperBuilder beans
 */
@Configuration
public class SerializationConfig {

    @Bean
    public Jackson2ObjectMapperBuilder objectMapperBuilder() {
        Jackson2ObjectMapperBuilder builder = new Jackson2ObjectMapperBuilder();
        builder.serializationInclusion(JsonInclude.Include.NON_NULL);
        builder.serializationInclusion(JsonInclude.Include.NON_EMPTY);
        builder.featuresToDisable(SerializationFeature.WRITE_NULL_MAP_VALUES);
        builder.indentOutput(true);
        return builder;
    }

    @Bean
    public XmlMapperProvider xmlMapperProvider() {
        return new XmlMapperProvider();
    }

    public static class XmlMapperProvider {
        @Getter
        private XmlMapper xmlMapper;

        public XmlMapperProvider() {
            JacksonXmlModule module = new JacksonXmlModule();
            module.setDefaultUseWrapper(false);
            xmlMapper = new XmlMapper(module);

            xmlMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, Boolean.FALSE);
            xmlMapper.configure(SerializationFeature.INDENT_OUTPUT, true);
            xmlMapper.configure(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT, Boolean.TRUE);
            xmlMapper.setSerializationInclusion(JsonInclude.Include.NON_ABSENT)
                     .setSerializationInclusion(JsonInclude.Include.NON_EMPTY)
                     .setSerializationInclusion(JsonInclude.Include.NON_NULL);
        }

    }

}
