package com.semafone.tndispatcher.model;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.google.common.base.Throwables;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;
import com.semafone.tndispatcher.config.SerializationConfig;
import com.semafone.tndispatcher.model.cs.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Maps CsResponse to CsXmlResponseModel
 */
@Component
public class CsXmlModelFactory {
    private final XmlMapper xmlMapper;

    @Autowired
    public CsXmlModelFactory(SerializationConfig.XmlMapperProvider xmlMapperProvider) {
        this.xmlMapper = xmlMapperProvider.getXmlMapper();
    }

    public String createResponseModel(CsResponse csResponse) {
        List<CsXmlResponseModel.ResponseMessage> responseMessages = Lists.newArrayList();

        for(CsOperationResult result: csResponse.getCsOperationResults()){
            CsXmlResponseModel.ResponseMessage responseMessage = new CsXmlResponseModel.ResponseMessage();
            final ResponseStatus responseStatus = result.getResponseStatus();
            responseMessage.setReasonCode(String.valueOf(responseStatus.getCode()));
            responseMessage.setRm(buildRmFrom(responseStatus));
            responseMessage.setSrcSystem(buildSrcSystem(result.getIdAndRequest()));
            responseMessage.setUser(buildUser(result.getIdAndRequest()));
            responseMessage.setVault(buildVault(result));
            responseMessage.setOperation(result.getVaultOperation());
            responseMessages.add(responseMessage);
        }


        CsXmlResponseModel.ResponseBody reseponseBody = new CsXmlResponseModel.ResponseBody();
        reseponseBody.setResponseMessage(responseMessages);
        CsXmlResponseModel.ResponseEnvelope envelope = new CsXmlResponseModel.ResponseEnvelope();
        envelope.setResponseBody(reseponseBody);
        try {
            return fixNamespace(xmlMapper.writeValueAsString(envelope));
        } catch (JsonProcessingException e) {
            throw Throwables.propagate(e);
        }
    }

    private String fixNamespace(String originalOutput) {
        String fixedOutput = originalOutput;
        fixedOutput = fixedOutput.replaceAll("wstxns1:","");
        fixedOutput = fixedOutput.replaceAll(":wstxns1","");
        fixedOutput = fixedOutput.replaceAll("wstxns2:","");
        fixedOutput = fixedOutput.replaceAll(":wstxns2","");
        fixedOutput = fixedOutput.replaceAll(" xmlns=\"\"","");
        Map<String,String> namespaces = ImmutableMap.of(
                "Envelope","env:",
                "Header","env:",
                "Body","env:",
                "responseMessages","urn:");
        for(Map.Entry<String,String> e:namespaces.entrySet()) {
            for(String prefix:new String[]{"<","</"}) {
                fixedOutput = fixedOutput.replaceAll((prefix + e.getKey()), prefix +  e.getValue() + e.getKey());
            }
        }
        Map<String,String> namespacesXmlns = ImmutableMap.of(
                ":Envelope xmlns",":env",
                ":responseMessages xmlns",":urn");
        for(Map.Entry<String,String> e:namespacesXmlns.entrySet()) {
            fixedOutput = fixedOutput.replaceAll(e.getKey(), e.getKey()+e.getValue());
        }
        return fixedOutput;
    }

    private CsXmlResponseModel.Vault buildVault(CsOperationResult result) {
        CsXmlResponseModel.Vault vault = new CsXmlResponseModel.Vault();
        if(result.getResponseStatus()==ResponseStatus.OK) {
            switch (result.getVaultOperation()){

                case TOKENIZE:
                    CsOperationResult.CsTokenizeOperationResult tOp = (CsOperationResult.CsTokenizeOperationResult) result;
                    vault.setToken(tOp.getToken());
                    break;
                case DETOKENIZE:
                    CsOperationResult.CsDetokenizeOperationResult dOp = (CsOperationResult.CsDetokenizeOperationResult) result;
                    vault.setCardType(dOp.getCardType().name());
                    vault.setCreditCardNumber(dOp.getCreditCardNumber());
                    break;
                case FIRSTSIX:
                    CsOperationResult.CsFirst6OperationResult dF = (CsOperationResult.CsFirst6OperationResult) result;
                    vault.setCardType(dF.getCardType().name());
                    vault.setCardFirstSix(dF.getPanFirst6());
                    break;
                case VERIFY:
                    CsOperationResult.CsVerifyOperationResult dV = (CsOperationResult.CsVerifyOperationResult) result;
                    vault.setToken(dV.getToken());
                    vault.setCardType(dV.getCardType().name());
                    break;
                case UNKNOWN:
                    break;
            }
        }
        return vault;
    }

    private CsXmlModel.SrcSystem buildSrcSystem(IdAndRequest idAndRequest) {
        return idAndRequest.getRequestMessage().getSrcSystem();
    }

    private CsXmlModel.CsUser buildUser(IdAndRequest idAndRequest) {
        return idAndRequest.getRequestMessage().getUser();
    }

    private CsXmlResponseModel.ResponseStatus buildRmFrom(ResponseStatus responseStatus) {
        CsXmlResponseModel.ResponseStatus rm = new CsXmlResponseModel.ResponseStatus();
        rm.setFlag(responseStatus==ResponseStatus.OK ? "ACCEPT": "REJECT");
        rm.setMessage(responseStatus.name());

        return rm;
    }
}
