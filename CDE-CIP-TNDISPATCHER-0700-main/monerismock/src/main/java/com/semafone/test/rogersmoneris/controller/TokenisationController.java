package com.semafone.test.rogersmoneris.controller;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.oxm.Marshaller;
import org.springframework.oxm.Unmarshaller;
import org.springframework.oxm.XmlMappingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.xml.transform.StringResult;
import org.springframework.xml.transform.StringSource;

import com.semafone.test.rogersmoneris.MockMonerisException;
import com.semafone.test.rogersmoneris.generated.mnrequest.Request;
import com.semafone.test.rogersmoneris.generated.mnresponse.Response;
import com.semafone.test.rogersmoneris.handler.RequestHandler;
import com.semafone.test.rogersmoneris.xml.MonerisResponseFactory;
import com.semafone.test.rogersmoneris.xml.SchemaValidator;

@RestController
public class TokenisationController {
	private static final Logger logger = LoggerFactory.getLogger(TokenisationController.class);
    
	@Autowired
	@Qualifier("monerisRequestUnmarshaller")
	private Unmarshaller requestUnmarshaller;
	
	@Autowired
	@Qualifier("monerisResponseMarshaller")
	private Marshaller responseMarshaller;
	
	@Autowired
	private SchemaValidator requestSchemaValidator;
	
	@Autowired
	private RequestHandler requestHandler;
	
	@Autowired
	private MonerisResponseFactory responseFactory;
	
	/**
	 * Receive the payload as a String rather than asking spring to marshall. Enables any marshalling
	 * errors to be explicitly responded to with a Moneris application error.
	 *  
	 * @param payload
	 * @return
	 * @throws IOException 
	 * @throws XmlMappingException 
	 */
	@RequestMapping(method=RequestMethod.POST, value="/moneris", produces = "application/xml")
    public String handlePost(@RequestBody String payload) throws XmlMappingException, IOException {
		logger.info("request received: " + payload);
		
		requestSchemaValidator.validate(payload);
		
		Request request = unmarshal(payload);
		Response response = requestHandler.handelRequest(request);

		String responseXml = marshal(response);
		logger.info("response sent: " + responseXml);
		return responseXml;
    }
	
	@ExceptionHandler(Exception.class)
	public String handleException(Exception cause) {
		logger.error("Unhandled exception", cause);
		Response response = responseFactory.unknownXmlErrorResponse();
		try {
			return marshal(response);
		} catch (Exception e) {
			logger.error("Unhandled exception", e);
			return "error";
		}
	}

	private Request unmarshal(String payload) throws IOException {
		return (Request)requestUnmarshaller.unmarshal(new StringSource(payload));
	}
	
	private String marshal(Response response) {
		try {
			StringResult result = new StringResult();
			responseMarshaller.marshal(response, result);
			return result.toString();
		} catch (XmlMappingException | IOException e) {
			throw new MockMonerisException("Marshalling error", e);
		}
	}
}
