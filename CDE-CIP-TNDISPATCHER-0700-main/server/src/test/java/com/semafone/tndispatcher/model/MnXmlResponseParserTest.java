package com.semafone.tndispatcher.model;

import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.google.common.collect.ImmutableList;
import com.semafone.tndispatcher.config.SerializationConfig;
import com.semafone.tndispatcher.model.cs.CsRequest;
import com.semafone.tndispatcher.model.mn.MnOperationResult;
import com.semafone.tndispatcher.model.mn.MnResponse;
import com.semafone.tndispatcher.model.mn.MnXmlResponseModel;
import com.semafone.tndispatcher.utils.FileUtils;
import org.junit.Test;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

public class MnXmlResponseParserTest {
    private static final String PATH_CSDETOKENIZE_REQUEST = "unittests/MnXmlResponseParserTest-mixedRequest.xml";
    private static final String PATH_CSDETOKENIZE_RESPONSE = "unittests/MnXmlResponseParserTest-mixedMnResponse.xml";
    private static final String PATH_CSDETOKENIZE_REQUEST_ALL = "unittests/MnXmlResponseParserTest-mixedRequestAll.xml";
    private static final String PATH_CSDETOKENIZE_RESPONSE_ALL = "unittests/MnXmlResponseParserTest-mixedMnResponseAll.xml";
    private final CsXmlModelParser parser = new CsXmlModelParser(new SerializationConfig().xmlMapperProvider());
    private final XmlMapper xmlMapper = new SerializationConfig.XmlMapperProvider().getXmlMapper();

    @Test
    public void shouldGenerateCorrectMonerisResponse() throws IOException {
        final MnResponse mnResponse = parseMnResponse(PATH_CSDETOKENIZE_REQUEST,PATH_CSDETOKENIZE_RESPONSE);

        assertEquals("expected 3 receipts",3,mnResponse.getMnOperationResults().size());
        final MnOperationResult res1 = mnResponse.getMnOperationResults().get(0);
        final MnOperationResult res2 = mnResponse.getMnOperationResults().get(1);
        final MnOperationResult res3 = mnResponse.getMnOperationResults().get(2);
        assertEquals(ResponseStatus.ERROR_RESPONSECODE,res1.getResponseStatus());
        assertEquals(ResponseStatus.OK, res2.getResponseStatus());
        assertEquals(ResponseStatus.OK, res3.getResponseStatus());
        System.out.println(mnResponse.toString());
    }
    @Test
    public void shouldGenerateCorrectMonerisResponseForAllOps() throws IOException {
        final MnResponse mnResponse = parseMnResponse(PATH_CSDETOKENIZE_REQUEST_ALL,PATH_CSDETOKENIZE_RESPONSE_ALL);

        assertEquals("expected 4 receipts",4,mnResponse.getMnOperationResults().size());
        assertFalse("expected success responses",mnResponse.getMnOperationResults().stream().anyMatch(result -> result.getResponseStatus() != ResponseStatus.OK));
        final List<VaultOperation> resultVaultOps = mnResponse.getMnOperationResults().stream().map(result -> result.getVaultOperation()).collect(Collectors.toList());

        assertEquals("response sequence mismatch",ImmutableList.of(VaultOperation.TOKENIZE,VaultOperation.DETOKENIZE,VaultOperation.FIRSTSIX,VaultOperation.VERIFY),resultVaultOps);
    }

    private MnResponse parseMnResponse(String pathToCsRequest, String pathToMnResponse) throws IOException {
        CsRequest csRequest = parser.parseRequest(FileUtils.getInputStream(pathToCsRequest));
        MnXmlResponseModel.MnXmlResponseBody mnXmlResponse = xmlMapper.readValue(FileUtils.getInputStream(pathToMnResponse), MnXmlResponseModel.MnXmlResponseBody.class);

        MnXmlResponseParser mnXmlResponseParser = new MnXmlResponseParser();
        return mnXmlResponseParser.parseResponse(csRequest, mnXmlResponse);
    }
}