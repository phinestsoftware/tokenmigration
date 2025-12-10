package com.semafone.tndispatcher.model;

import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.google.common.collect.ImmutableList;
import com.semafone.tndispatcher.config.SerializationConfig;
import com.semafone.tndispatcher.model.cs.CsOperationResult;
import com.semafone.tndispatcher.model.cs.CsRequest;
import com.semafone.tndispatcher.model.cs.CsResponse;
import com.semafone.tndispatcher.model.mn.MnResponse;
import com.semafone.tndispatcher.model.mn.MnXmlResponseModel;
import com.semafone.tndispatcher.utils.FileUtils;
import org.junit.Test;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

public class MnToCsResponseMapperTest {
    private static final String PATH_CSDETOKENIZE_REQUEST_ALL = "unittests/MnToCsResponseMapperTest-mixedRequestAll.xml";
    private static final String PATH_CSDETOKENIZE_RESPONSE_ALL = "unittests/MnToCsResponseMapperTest-mixedMnResponseAll.xml";
    private final CsXmlModelParser parser = new CsXmlModelParser(new SerializationConfig().xmlMapperProvider());
    private final XmlMapper xmlMapper = new SerializationConfig.XmlMapperProvider().getXmlMapper();

    @Test
    public void shouldGenerateCorrectMonerisResponseForAllOps() throws IOException {
        final CsResponse csResponse = parseMnResponse(PATH_CSDETOKENIZE_REQUEST_ALL,PATH_CSDETOKENIZE_RESPONSE_ALL);

        assertEquals("expected 4 receipts",4,csResponse.getCsOperationResults().size());
        assertFalse("expected success responses",csResponse.getCsOperationResults().stream().anyMatch(result -> result.getResponseStatus() != ResponseStatus.OK));
        final List<VaultOperation> resultVaultOps = csResponse.getCsOperationResults().stream().map(CsOperationResult::getVaultOperation).collect(Collectors.toList());

        assertEquals("response sequence mismatch",ImmutableList.of(VaultOperation.TOKENIZE,VaultOperation.DETOKENIZE,VaultOperation.FIRSTSIX,VaultOperation.VERIFY),resultVaultOps);
    }

    private CsResponse parseMnResponse(String pathToCsRequest, String pathToMnResponse) throws IOException {
        CsRequest csRequest = parser.parseRequest(FileUtils.getInputStream(pathToCsRequest));
        MnXmlResponseModel.MnXmlResponseBody mnXmlResponse = xmlMapper.readValue(FileUtils.getInputStream(pathToMnResponse), MnXmlResponseModel.MnXmlResponseBody.class);

        MnXmlResponseParser mnXmlResponseParser = new MnXmlResponseParser();
        final MnResponse mnResponse = mnXmlResponseParser.parseResponse(csRequest, mnXmlResponse);
        return MnToCsResponseMapper.mapResponse(mnResponse);
    }
}