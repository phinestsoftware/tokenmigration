package com.rogers.cashintegration.bpsservice.util;

import java.io.File;
import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.xml.sax.SAXException;

import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.JAXBException;
import jakarta.xml.bind.Marshaller;
import jakarta.xml.bind.Unmarshaller;

/**
 * @author : Shankar.Chakraborty
 * @project :otcc-service
 **/


@Component
public class XmlUtils {
	
	private XmlUtils() {
	  }
    // Marshalling Object to XML string
    public static <T> String marshal(T response) throws JAXBException {
        JAXBContext jaxbContext = JAXBContext.newInstance(response.getClass());
        Marshaller marshaller = jaxbContext.createMarshaller();
        marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.TRUE);

        StringWriter stringWriter = new StringWriter();
        marshaller.marshal(response, stringWriter);
        return stringWriter.toString();
    }

    // Unmarshalling XML string to Object
    @SuppressWarnings("unchecked")
    public static <T> T unmarshal(String xml, Class<T> responseType) throws JAXBException {
        JAXBContext jaxbContext = JAXBContext.newInstance(responseType);
        Unmarshaller unmarshaller = jaxbContext.createUnmarshaller();
		
		 
        StringReader reader = new StringReader(xml);
        return (T) unmarshaller.unmarshal(reader);
    }
    
    
	@SuppressWarnings("unchecked")
	public static <T> T unmarshalCS(String xml, Class<T> responseType)
			throws JAXBException{
		JAXBContext jaxbContext = JAXBContext.newInstance(responseType);
		Unmarshaller unmarshaller = jaxbContext.createUnmarshaller();
		unmarshaller.setProperty("jakarta.xml.bind.attachment.indexed", false);
		StringReader reader = new StringReader(xml);
		return (T) unmarshaller.unmarshal(reader);
	}
    

    public static String maskString(String str, int visibleChars) {
        int maskedLength = str.length() - visibleChars;
        StringBuilder masked = new StringBuilder();
        for (int i = 0; i < maskedLength; i++) {
            masked.append('*');
        }
        masked.append(str.substring(maskedLength));
        return masked.toString();
    }
}
