package com.semafone.test.rogersmoneris.xml;

import java.io.IOException;

import javax.xml.XMLConstants;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.xml.transform.StringSource;
import org.xml.sax.SAXException;

import com.semafone.test.rogersmoneris.MockMonerisException;

public class SchemaValidator {
	private static final Logger logger = LoggerFactory.getLogger(SchemaValidator.class);
	
	private Validator validator;
	
	public void validate(String xmlString) {
	    try {
	        validator.validate(new StringSource(xmlString));
	    }
	    catch(Exception e) {
	    	logger.error("schema validation failed for "+xmlString, e);
	    	throw new MockMonerisException("schema validation failed for "+xmlString, e);
	    }
	}

	public void loadXsd(Resource resource) {
		try {
			tryLoadXsd(resource);
		} catch (SAXException | IOException e) {
			logger.error("Failed to load schema", e);
			throw new MockMonerisException("Failed to load schema", e);
		}
	}

	private void tryLoadXsd(Resource resource) throws SAXException, IOException {
		SchemaFactory factory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
		Schema schema = factory.newSchema(new StreamSource(resource.getInputStream()));
		validator = schema.newValidator();
	}
}
