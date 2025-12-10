package com.semafone.tndispatcher.model;

import com.google.common.collect.ImmutableMap;
import com.semafone.tndispatcher.config.SerializationConfig;
import com.semafone.tndispatcher.model.cs.CsRequest;
import com.semafone.tndispatcher.model.mn.MnRequest;
import com.semafone.tndispatcher.utils.FileUtils;
import org.json.JSONException;
import org.json.XML;
import org.junit.Test;

import java.io.IOException;

import static com.semafone.tndispatcher.utils.DataMatchingUtil.validateBodyPath;


public class MnXmlModelFactoryTest {
    private static final String PATH_CSDETOKENIZE_REQUEST = "unittests/MnXmlModelFactoryTest-mixedRequest.xml";
    private final CsXmlModelParser parser = new CsXmlModelParser(new SerializationConfig().xmlMapperProvider());

    private MnRequest createMnRequest() throws IOException {
        CsRequest csRequest = parser.parseRequest(FileUtils.getInputStream(PATH_CSDETOKENIZE_REQUEST));
        MnRequest mnRequest = CsToMnRequestMapper.mapRequest(csRequest);
        return mnRequest;
    }

    @Test
    public void shouldGenerateCorrectMonerisRequestXml() throws IOException {
        MnXmlModelFactory factory = new MnXmlModelFactory(new SerializationConfig.XmlMapperProvider());
        String requestXml = factory.createRequestXml(createMnRequest());
        System.out.println(requestXml);

        String responseBodyJson = null;
        try {
            responseBodyJson = XML.toJSONObject(requestXml).toString();

        validateBodyPath(responseBodyJson, "$.request", ImmutableMap.of(
                "store_id", "wsse.username",
                "api_token", "wsse.password"));
        validateBodyPath(responseBodyJson, "$.request.res_batch", ImmutableMap.of(
                "res_add_cc.pan", "accountNumber",
                "res_add_cc.card_type", "V",
                "res_lookup_full.data_key", "1234000012340000"));
        } catch (JSONException e) {
            throw new RuntimeException(e);
        }
    }


}