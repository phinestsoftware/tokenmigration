package com.semafone.tndispatcher.model;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.google.common.base.Throwables;
import com.semafone.tndispatcher.config.SerializationConfig;
import com.semafone.tndispatcher.model.mn.MnOperation;
import com.semafone.tndispatcher.model.mn.MnRequest;
import com.semafone.tndispatcher.model.mn.MnXmlRequestModel;
import com.semafone.tndispatcher.model.mn.MnXmlRequestModel.RequestDetokenizeOperation;
import com.semafone.tndispatcher.model.mn.MnXmlRequestModel.RequestFirstSixOperation;
import com.semafone.tndispatcher.model.mn.MnXmlRequestModel.RequestTokenizeOperation;
import com.semafone.tndispatcher.model.mn.MnXmlRequestModel.RequestVerifyOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Maps MnRequest to MnXmlRequestModel
 */
@Component
public class MnXmlModelFactory {
    private static final String HEADER = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
    private final XmlMapper xmlMapper;

    @Autowired
    public MnXmlModelFactory(SerializationConfig.XmlMapperProvider xmlMapperProvider) {
        this.xmlMapper = xmlMapperProvider.getXmlMapper();
    }

    public String createRequestXml(MnRequest mnRequest) {
        MnXmlRequestModel.RequestBody mnXmlRequest = mapToXmlRequest(mnRequest);
        try {
            String xml = xmlMapper.writer().writeValueAsString(mnXmlRequest);
            return HEADER + '\n' + xml;
        } catch (JsonProcessingException e) {
            throw Throwables.propagate(e);
        }
    }

    private MnXmlRequestModel.RequestBody mapToXmlRequest(MnRequest mnRequest) {
        MnXmlRequestModel.RequestBody body = new MnXmlRequestModel.RequestBody();
        body.setStoreId(mnRequest.getMnCredentials().getStoreId());
        body.setApiToken(mnRequest.getMnCredentials().getApiToken());
        mnRequest.getMnOperations().stream()
                .map(this::mapToXmlOperation)
                .forEach(body::addOperation);
        return body;
    }

    private MnXmlRequestModel.RequestOperation mapToXmlOperation(MnOperation mnOperation) {
        switch (mnOperation.getVaultOperation()) {
            case TOKENIZE:
                return mapToTokenizeXmlOperation((MnOperation.MnTokenizeOperation) mnOperation);
            case DETOKENIZE:
                return mapToDetokenizeXmlOperation((MnOperation.MnLookupFullOperation) mnOperation);
            case FIRSTSIX:
                return mapToFirstSixXmlOperation((MnOperation.MnLookupMaskedOperation) mnOperation);
            case VERIFY:
                return mapToVerifyXmlOperation((MnOperation.MnLookupMaskedOperation) mnOperation);
            default:
                throw new IllegalArgumentException(
                        String.format("Operation [%s] mapper not implemented", mnOperation.getVaultOperation().name()));
        }
    }

    private RequestTokenizeOperation mapToTokenizeXmlOperation(MnOperation.MnTokenizeOperation mnOperation) {
        RequestTokenizeOperation xmlOperation = new RequestTokenizeOperation();
        xmlOperation.setAccountNumber(mnOperation.getAccountNumber());
        xmlOperation.setCardType(mnOperation.getCardType().name());
        return xmlOperation;
    }

    private RequestDetokenizeOperation mapToDetokenizeXmlOperation(MnOperation.MnLookupFullOperation mnOperation) {
        RequestDetokenizeOperation xmlOperation = new RequestDetokenizeOperation();
        xmlOperation.setToken(mnOperation.getToken());
        return xmlOperation;
    }

    private RequestFirstSixOperation mapToFirstSixXmlOperation(MnOperation.MnLookupMaskedOperation mnOperation) {
        RequestFirstSixOperation xmlOperation = new RequestFirstSixOperation();
        xmlOperation.setToken(mnOperation.getToken());
        return xmlOperation;
    }

    private RequestVerifyOperation mapToVerifyXmlOperation(MnOperation.MnLookupMaskedOperation mnOperation) {
        RequestVerifyOperation xmlOperation = new RequestVerifyOperation();
        xmlOperation.setToken(mnOperation.getToken());
        return xmlOperation;
    }
}
