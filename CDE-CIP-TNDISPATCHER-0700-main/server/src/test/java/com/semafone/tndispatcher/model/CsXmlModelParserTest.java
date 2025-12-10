package com.semafone.tndispatcher.model;

import com.google.common.collect.ImmutableList;
import com.semafone.tndispatcher.config.SerializationConfig;
import com.semafone.tndispatcher.model.cs.CsOperation;
import com.semafone.tndispatcher.model.cs.CsRequest;
import com.semafone.tndispatcher.utils.FileUtils;
import org.junit.Test;

import java.io.IOException;
import java.util.function.BiConsumer;
import java.util.stream.Collectors;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class CsXmlModelParserTest {
    public static final String UNITTESTS_PREFIX = "unittests/CsXmlModelParserTest-";
    private static final String PATH_CSTOKENIZE_REQUEST = UNITTESTS_PREFIX + "tokenizeRequest.xml";
    private static final String PATH_CSTOKENIZE_RESPONSE = UNITTESTS_PREFIX + "tokenizeResponse.xml";
    private static final String PATH_CSDETOKENIZE_REQUEST = UNITTESTS_PREFIX + "DEtokenizeRequest.xml";
    private static final String PATH_VERIFY_CARDTYPE_REQUEST = UNITTESTS_PREFIX + "verifyCardTypeRequest.xml";

    @Test
    public void shouldParseCsTokenizeRequest() throws IOException {
        CsXmlModelParser parser = new CsXmlModelParser(new SerializationConfig().xmlMapperProvider());
        CsRequest csRequest = parser.parseRequest(FileUtils.getInputStream(PATH_CSTOKENIZE_REQUEST));
        assertEquals("exepcted 2 tokenize ops", 2, csRequest.getCsOperations().size());
        assertEquals("expected same vaultOperations sequence", ImmutableList.of("D", "V"),
                csRequest.getCsOperations().stream()
                         .map(csOp -> (CsOperation.CsTokenizeOperation) csOp)
                         .map(tokenizeOp -> tokenizeOp.getCardType().name())
                         .collect(Collectors.toList()));
        csRequest.getCsOperations().forEach(this::verifyOperationType);
    }

    @Test
    public void shouldParseCsDeTokenizeRequest() throws IOException {
        CsXmlModelParser parser = new CsXmlModelParser(new SerializationConfig().xmlMapperProvider());
        CsRequest csRequest = parser.parseRequest(FileUtils.getInputStream(PATH_CSDETOKENIZE_REQUEST));
        assertEquals("exepcted 1 detokenize ops", 1, csRequest.getCsOperations().size());
        csRequest.getCsOperations().forEach(this::verifyOperationType);
    }

    @Test
    public void shouldParseVerifyWithCardTypeRequest() throws IOException {
        CsXmlModelParser parser = new CsXmlModelParser(new SerializationConfig().xmlMapperProvider());
        CsRequest csRequest = parser.parseRequest(FileUtils.getInputStream(PATH_VERIFY_CARDTYPE_REQUEST));
        assertEquals("exepcted 1 detokenize ops", 1, csRequest.getCsOperations().size());
        csRequest.getCsOperations().forEach(this::verifyOperationType);
    }

    private void verifyOperationType(CsOperation csOperation) {
        final BiConsumer<CsOperation, Class> csOperationAssertion = (CsOperation csOp, Class clazz) -> assertTrue(
                String.format("[%s] operation has invalid type [%s]. Expected [%s]",
                        csOp.getVaultOperation(), csOp.getClass().getSimpleName(), clazz.getSimpleName()),
                (csOp.getClass().equals(clazz)));

        switch (csOperation.getVaultOperation()) {
            case TOKENIZE:
                csOperationAssertion.accept(csOperation, CsOperation.CsTokenizeOperation.class);
                break;
            case DETOKENIZE:
                csOperationAssertion.accept(csOperation, CsOperation.CsDetokenizeOperation.class);
                break;
            case VERIFY:
                csOperationAssertion.accept(csOperation, CsOperation.CsVerifyOperation.class);
                break;
            case FIRSTSIX:
                csOperationAssertion.accept(csOperation, CsOperation.CsVerifyOperation.class);
                break;
        }
    }

}