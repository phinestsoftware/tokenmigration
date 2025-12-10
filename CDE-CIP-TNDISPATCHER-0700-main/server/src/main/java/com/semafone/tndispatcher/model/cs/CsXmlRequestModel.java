package com.semafone.tndispatcher.model.cs;

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;
import lombok.Data;

import java.util.List;

public class CsXmlRequestModel {
    private CsXmlRequestModel() {
    }

    @JacksonXmlRootElement(namespace = "soapenv",localName = "Envelope")
    @Data
    public static class RequestEnvelope {
        @JacksonXmlProperty(localName = "Header")
        public RequestHeader header;
        @JacksonXmlProperty(localName = "Body")
        public RequestBody requestBody;
    }
    @Data
    @JacksonXmlRootElement(namespace = "soapenv", localName = "Header")
    public static class RequestHeader {
        @JacksonXmlProperty(localName = "Security")
        public Security security;
    }
    @Data
    @JacksonXmlRootElement(namespace = "wsse", localName = "Security")
    public static class Security{
        @JacksonXmlProperty(localName = "UsernameToken")
        public UsernameToken usernameToken;
    }
    @Data
    public static class UsernameToken{
        @JacksonXmlProperty(namespace = "wsu", localName = "Id",isAttribute = true)
        public String wsuId;
        @JacksonXmlProperty(namespace = "wsse", localName = "Username")
        public String userName;
        @JacksonXmlProperty(namespace = "wsse", localName = "Password")
        public String password;
    }

    @Data
    @JacksonXmlRootElement(namespace = "soapenv", localName = "Body")
    public static class RequestBody {

        @JacksonXmlProperty(localName = "requestMessages")
        public RequestMessages requestMessages;

    }

    @Data
    @JacksonXmlRootElement(localName = "requestMessage")
    public static class RequestMessage{

        @JacksonXmlProperty(localName = "srcSystem")
        public CsXmlModel.SrcSystem srcSystem;
        @JacksonXmlProperty(localName = "user")
        public CsXmlModel.CsUser user;
        @JacksonXmlProperty(localName = "card")
        public Card card;

        @JacksonXmlProperty(localName = "ccTokenizeService")
        public CsXmlModel.CcTokenizeService ccTokenizeService;
        @JacksonXmlProperty(localName = "ccDeTokenizeService")
        public CsXmlModel.CcDeTokenizeService ccDeTokenizeService;
        @JacksonXmlProperty(localName = "ccFirstSixService")
        public CsXmlModel.CcFirstSixService ccFirstSixService;
        @JacksonXmlProperty(localName = "ccVerifyService")
        public CsXmlModel.CcVerifyService ccVerifyService;
    }

    @Data
    public static class RequestMessages{
        @JacksonXmlProperty(localName = "requestId")
        public String requestId;
        @JacksonXmlProperty(localName = "requestMessage")
        public List<RequestMessage> requestMessages;
    }


    @Data
    public static class Card{
        @JacksonXmlProperty(localName = "accountNumber")
        public String accountNumber;
        @JacksonXmlProperty(localName = "token")
        public String token;
        @JacksonXmlProperty(localName = "cardType")
        public String cardType;
        @JacksonXmlProperty(localName = "expirationMonth")
        public int expirationMonth;
        @JacksonXmlProperty(localName = "expirationYear")
        public int expirationYear;
    }

}
