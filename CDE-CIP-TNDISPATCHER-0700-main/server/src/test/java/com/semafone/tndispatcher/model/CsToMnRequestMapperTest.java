package com.semafone.tndispatcher.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.semafone.tndispatcher.config.SerializationConfig;
import com.semafone.tndispatcher.model.cs.CsOperation;
import com.semafone.tndispatcher.model.cs.CsRequest;
import com.semafone.tndispatcher.model.mn.MnCardType;
import com.semafone.tndispatcher.model.mn.MnOperation;
import com.semafone.tndispatcher.model.mn.MnRequest;
import com.semafone.tndispatcher.utils.FileUtils;
import org.junit.Test;

import java.io.IOException;
import java.util.Iterator;

import static org.junit.Assert.*;

public class CsToMnRequestMapperTest {
    private static final String PATH_CSDETOKENIZE_REQUEST = "unittests/CsToMnRequestMapperTest-DEtokenizeRequest.xml";
    private final ObjectMapper objectMapper = new SerializationConfig().objectMapperBuilder().build();
    private final CsXmlModelParser parser = new CsXmlModelParser(new SerializationConfig().xmlMapperProvider());

    @Test
    public void shouldCorrectlyMapCsRequest() throws IOException {
        CsRequest csRequest = parser.parseRequest(FileUtils.getInputStream(PATH_CSDETOKENIZE_REQUEST));
        MnRequest mnRequest = CsToMnRequestMapper.mapRequest(csRequest);
        assertEquals(mnRequest.getMnCredentials().getStoreId(),csRequest.getCsCredentials().getUserName());
        assertEquals(mnRequest.getMnCredentials().getApiToken(),csRequest.getCsCredentials().getPassword());
        assertEquals(csRequest.getCsOperations().size(),mnRequest.getMnOperations().size()) ;
        Iterator<MnOperation> mnOpIterator = mnRequest.getMnOperations().iterator();
        for(CsOperation csOperation:csRequest.getCsOperations()){
            assertTrue(mnOpIterator.hasNext());
            MnOperation mnOp = mnOpIterator.next();
            assertEquals(csOperation.getIdAndRequest().getMessageId(),mnOp.getIdAndRequest().getMessageId());
            assertEquals(csOperation.getVaultOperation(),mnOp.getVaultOperation());
            assertOperationsEqual(csOperation, mnOp);

        }

    }

    private void assertOperationsEqual(CsOperation csOperation, MnOperation mnOperation) {
        switch (csOperation.getVaultOperation()){

            case TOKENIZE:
                assertTrue(mnOperation instanceof MnOperation.MnTokenizeOperation);
                assertTokenizeMapping((CsOperation.CsTokenizeOperation) csOperation, (MnOperation.MnTokenizeOperation) mnOperation);
                break;
            case DETOKENIZE:
                assertTrue(mnOperation instanceof MnOperation.MnLookupFullOperation);
                assertDetokenizeMapping((CsOperation.CsDetokenizeOperation) csOperation, (MnOperation.MnLookupFullOperation) mnOperation);
                break;
            case FIRSTSIX:
            case VERIFY:
            default:
                fail(String.format("Operation [%s] not implemented", csOperation.getVaultOperation()));
        }
    }

    private void assertTokenizeMapping(CsOperation.CsTokenizeOperation csOperation, MnOperation.MnTokenizeOperation mnOperation) {
        assertEquals("cardNumber mismatch",csOperation.getAccountNumber(), mnOperation.getAccountNumber());
        assertEquals("cardType mismatch",MnCardType.fromCsCardType(csOperation.getCardType()), mnOperation.getCardType());
    }
    private void assertDetokenizeMapping(CsOperation.CsDetokenizeOperation csOperation, MnOperation.MnLookupFullOperation mnOperation) {
        assertEquals("token mismatch",csOperation.getToken(), mnOperation.getToken());
    }


}