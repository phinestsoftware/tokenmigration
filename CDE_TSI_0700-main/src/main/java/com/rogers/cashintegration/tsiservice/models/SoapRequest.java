package com.rogers.cashintegration.tsiservice.models;

import jakarta.xml.bind.annotation.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by Shankar.Chakraborty on 2023-12-01
 *
 * @author : Shankar.Chakraborty
 * @date : 2023-12-01
 * @project :tsi-service
 **/

@Data
@XmlRootElement(name = "Envelope", namespace = "http://schemas.xmlsoap.org/soap/envelope/")
@XmlAccessorType(XmlAccessType.FIELD)
public class SoapRequest {

    @XmlElement(name = "Header", namespace = "http://schemas.xmlsoap.org/soap/envelope/")
    private Header header;

    @XmlElement(name = "Body", namespace = "http://schemas.xmlsoap.org/soap/envelope/")
    private Body body;

    @Data
    @XmlAccessorType(XmlAccessType.FIELD)
    public static class Header {

        @XmlElement(name = "Security", namespace = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd")
        private Security security;


        @Data
        @XmlAccessorType(XmlAccessType.FIELD)
        public static class Security {

            @XmlElement(name = "UsernameToken", namespace = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd")
            private UsernameToken usernameToken;


            @Data
            @XmlAccessorType(XmlAccessType.FIELD)
            public static class UsernameToken {

                @XmlElement(name = "Username", namespace = "http://schemas.xmlsoap.org/soap/envelope/")
                private String username;

                @XmlElement(name = "Password", namespace = "http://schemas.xmlsoap.org/soap/envelope/")
                private Password password;

                @Data
                @XmlAccessorType(XmlAccessType.FIELD)
                public static class Password {

                    @XmlAttribute(name = "Type")
                    private String type;

                    @XmlValue
                    private String value;

                } //Password
            } //UsernameToken
        } //Security
    } //Header


    @ToString
    @NoArgsConstructor
    @XmlAccessorType(XmlAccessType.FIELD)
    public static class Body {

        @XmlElement(name = "requestMessages", namespace = "urn:schemas-cybersource-com:transaction-data-2.3")
        private List<RequestMessages> requestMessages;

        public List<RequestMessages> getRequestMessages() {
            if (requestMessages == null) {
                requestMessages = new ArrayList<>();
            }
            return this.requestMessages;
        }



        @Data
        @XmlAccessorType(XmlAccessType.FIELD)
        public static class RequestMessages {

            @XmlElement(name = "requestId")
            private String requestId;

            @XmlElement(name = "requestMessage")
            private RequestMessage requestMessage;

            @Data
            @XmlAccessorType(XmlAccessType.FIELD)
            public static class RequestMessage {

                @XmlElement(name = "srcSystem")
                private SrcSystem srcSystem;

                @XmlElement(name = "card")
                private Card card;

                @XmlElement(name = "ccTokenizeService")
                private CcTokenizeService ccTokenizeService;

                @Data
                @XmlAccessorType(XmlAccessType.FIELD)
                public static class SrcSystem {

                    @XmlElement(name = "name")
                    private String name;

                    @XmlElement(name = "sysIndicator")
                    private String sysIndicator;

                    @XmlElement(name = "messageId")
                    private String messageId;

                } //SrcSystem

                @Data
                @XmlAccessorType(XmlAccessType.FIELD)
                public static class Card {

                    @XmlElement(name = "accountNumber")
                    private String accountNumber;

                    @XmlElement(name = "cardType")
                    private String cardType;

                } //Card

                @Data
                @XmlAccessorType(XmlAccessType.FIELD)
                public static class CcTokenizeService {

                    @XmlAttribute(name = "run")
                    private Boolean run;

                } //CcTokenizeService
            } //RequestMessage
        } //RequestMessages
    } //Body
} //Soap

















