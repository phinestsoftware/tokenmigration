package com.semafone.tndispatcher.model;

import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.semafone.tndispatcher.config.SerializationConfig;
import com.semafone.tndispatcher.model.cs.CsRequest;
import com.semafone.tndispatcher.model.cs.CsResponse;
import com.semafone.tndispatcher.model.mn.MnResponse;
import com.semafone.tndispatcher.model.mn.MnXmlResponseModel;
import com.semafone.tndispatcher.utils.FileUtils;
import org.junit.Test;

import java.io.IOException;

import static org.junit.Assert.assertTrue;

public class CsXmlModelFactoryTest {
    private static final String PATH_CSDETOKENIZE_REQUEST_ALL = "unittests/CsXmlModelFactoryTest-mixedRequestAll.xml";
    private static final String PATH_CSDETOKENIZE_RESPONSE_ALL = "unittests/CsXmlModelFactoryTest-mixedMnResponseAll.xml";
    private final CsXmlModelParser parser = new CsXmlModelParser(new SerializationConfig().xmlMapperProvider());
    private final XmlMapper xmlMapper = new SerializationConfig.XmlMapperProvider().getXmlMapper();

    @Test
    public void shouldGenerateCorrectMonerisResponseForAllOps() throws IOException {
        final CsResponse csResponse = parseMnResponse(PATH_CSDETOKENIZE_REQUEST_ALL, PATH_CSDETOKENIZE_RESPONSE_ALL);
        String responseXml = new CsXmlModelFactory(new SerializationConfig.XmlMapperProvider()).createResponseModel(csResponse);
        System.out.println(responseXml);
        assertTrue(responseXml.contains("<env:Envelope"));
        assertTrue(responseXml.contains("<env:Body"));
        assertTrue(responseXml.contains("<urn:responseMessages"));
    }

    private CsResponse parseMnResponse(String pathToCsRequest, String pathToMnResponse) throws IOException {
        CsRequest csRequest = parser.parseRequest(FileUtils.getInputStream(pathToCsRequest));
        MnXmlResponseModel.MnXmlResponseBody mnXmlResponse = xmlMapper.readValue(FileUtils.getInputStream(pathToMnResponse), MnXmlResponseModel.MnXmlResponseBody.class);

        MnXmlResponseParser mnXmlResponseParser = new MnXmlResponseParser();
        final MnResponse mnResponse = mnXmlResponseParser.parseResponse(csRequest, mnXmlResponse);
        return MnToCsResponseMapper.mapResponse(mnResponse);
    }
}