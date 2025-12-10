package com.rogers.cashintegration.tsiservice.utils;

import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.JAXBException;
import jakarta.xml.bind.Marshaller;
import jakarta.xml.bind.Unmarshaller;

import java.io.StringReader;
import java.io.StringWriter;

/**
 * Created by Shankar.Chakraborty on 2023-12-01
 *
 * @author : Shankar.Chakraborty
 * @date : 2023-12-01
 * @project :tsi-service
 **/


public class SoapMarshallerUtils {

    // Marshalling SOAP response to XML string
    public static <T> String marshalSoapResponse(T soapResponse) throws JAXBException {
        JAXBContext jaxbContext = JAXBContext.newInstance(soapResponse.getClass());
        Marshaller marshaller = jaxbContext.createMarshaller();
        marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.TRUE);

        StringWriter stringWriter = new StringWriter();
        marshaller.marshal(soapResponse, stringWriter);
        return stringWriter.toString();
    }

    // Unmarshalling XML string to SOAP response object
    @SuppressWarnings("unchecked")
    public static <T> T unmarshalSoapResponse(String xml, Class<T> responseType) throws JAXBException {
        JAXBContext jaxbContext = JAXBContext.newInstance(responseType);
        Unmarshaller unmarshaller = jaxbContext.createUnmarshaller();

        StringReader reader = new StringReader(xml);
        return (T) unmarshaller.unmarshal(reader);
    }
}
