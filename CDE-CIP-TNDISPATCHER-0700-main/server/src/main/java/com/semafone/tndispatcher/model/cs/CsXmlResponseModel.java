package com.semafone.tndispatcher.model.cs;

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;
import com.semafone.tndispatcher.model.VaultOperation;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

public class CsXmlResponseModel {
    private CsXmlResponseModel() {
    }
    
    @Getter
    @Setter
    @ToString
    @JacksonXmlRootElement(namespace = "http://schemas.xmlsoap.org/soap/envelope/",localName = "Envelope")
    public static class ResponseEnvelope {
        @JacksonXmlProperty(localName = "Body")
        public ResponseBody responseBody;
    }
    @Getter
    @Setter
    @ToString
    @JacksonXmlRootElement(localName = "Body")
    public static class ResponseBody {
        @JacksonXmlElementWrapper(namespace = "urn:schemas-cybersource-com:transaction-data-2.3",localName = "responseMessages")
        public List<ResponseMessage> responseMessage;
    }

    @Getter
    @Setter
    @ToString
    @JacksonXmlRootElement(localName = "requestMessage")
    public static class ResponseMessage {
        @JacksonXmlProperty(localName = "srcSystem")
        public CsXmlModel.SrcSystem srcSystem;
        @JacksonXmlProperty(localName = "user")
        public CsXmlModel.CsUser user;
        @JacksonXmlProperty(localName = "card")
        public CsXmlRequestModel.Card card;
        @JacksonXmlProperty(localName = "vault")
        public Vault vault;
        @JacksonXmlProperty(localName = "rm")
        public ResponseStatus rm;
        @JacksonXmlProperty(localName = "reasonCode")
        public String  reasonCode;
        @JacksonXmlProperty(localName = "ccTokenizeService")
        public CsXmlModel.CcTokenizeService ccTokenizeService;
        @JacksonXmlProperty(localName = "ccDeTokenizeService")
        public CsXmlModel.CcDeTokenizeService ccDeTokenizeService;
        @JacksonXmlProperty(localName = "ccFirstSixService")
        public CsXmlModel.CcFirstSixService ccFirstSixService;
        @JacksonXmlProperty(localName = "ccVerifyService")
        public CsXmlModel.CcVerifyService ccVerifyService;

        public void setOperation(VaultOperation vaultOperation) {
            switch (vaultOperation){

                case TOKENIZE:
                    final CsXmlModel.CcTokenizeService tokenisationService = new CsXmlModel.CcTokenizeService();
                    tokenisationService.setRun(true);
                    setCcTokenizeService(tokenisationService);
                    break;
                case DETOKENIZE:
                    final CsXmlModel.CcDeTokenizeService deTokenisationService = new CsXmlModel.CcDeTokenizeService();
                    deTokenisationService.setRun(true);
                    setCcDeTokenizeService(deTokenisationService);
                    break;
                case FIRSTSIX:
                    final CsXmlModel.CcFirstSixService firstSixService = new CsXmlModel.CcFirstSixService();
                    firstSixService.setRun(true);
                    setCcFirstSixService(firstSixService);
                    break;
                case VERIFY:
                    final CsXmlModel.CcVerifyService verifyService = new CsXmlModel.CcVerifyService();
                    verifyService.setRun(true);
                    setCcVerifyService(verifyService);
                    break;
                default:
                    throw new IllegalArgumentException("Invalid vaultOperation: " + vaultOperation.name());
            }
        }
    }

    @Getter
    @Setter
    @ToString
    public static class Vault{
        @JacksonXmlProperty(localName = "creditCardNumber")
        public String creditCardNumber;
        @JacksonXmlProperty(localName = "cardFirstSix")
        public String cardFirstSix;
        @JacksonXmlProperty(localName = "token")
        public String token;
        @JacksonXmlProperty(localName = "cardType")
        public String cardType;
    }

    @Getter
    @Setter
    @ToString
    public static class ResponseStatus{
        @JacksonXmlProperty(localName = "rflag")
        public String flag;
        @JacksonXmlProperty(localName = "rmsg")
        public String message;
    }



}
