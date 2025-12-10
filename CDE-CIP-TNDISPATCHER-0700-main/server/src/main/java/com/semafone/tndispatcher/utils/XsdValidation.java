package com.semafone.tndispatcher.utils;

import com.google.common.base.Throwables;
import lombok.extern.slf4j.Slf4j;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.transform.Source;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
public class XsdValidation {
    private Schema schema;

    private XsdValidation() {
    }

    public XsdValidation(List<String> schemas) {
        SchemaFactory schemaFactory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        try {
            schemaFactory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            Source[] schemaSources = schemas.stream().map(location -> {
                try {
                    return new StreamSource(FileUtils.getInputStream(location));
                } catch (IOException e) {
                    throw Throwables.propagate(e);
                }
            }).collect(Collectors.toList()).toArray(new Source[]{});

            this.schema = schemaFactory.newSchema(schemaSources);
        } catch (SAXException e) {
            throw Throwables.propagate(e);
        }
    }

    public void validate(String request) throws SAXException {
        try {

            Source xmlFile = new StreamSource(new ByteArrayInputStream(request.getBytes()));
            Validator validator = schema.newValidator();
            validator.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            validator.validate(xmlFile);
        } catch (IOException e) {
            throw Throwables.propagate(e);
        }
    }

    public static class NoOpXsdValidation extends XsdValidation {
        @Override
        public void validate(String request) throws SAXException {
            //noop
        }
    }

}