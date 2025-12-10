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
public class SoapResponse {

    @XmlElement(name = "Body", namespace = "http://schemas.xmlsoap.org/soap/envelope/")
    private Body body;

    @Data
    @XmlAccessorType(XmlAccessType.FIELD)
    public static class Body {

        @XmlElement(name = "responseMessages", namespace = "urn:schemas-cybersource-com:transaction-data-2.3")
        private ResponseMessages responseMessages;

        @ToString
        @NoArgsConstructor
        @XmlAccessorType(XmlAccessType.FIELD)
        public static class ResponseMessages {

            @XmlElement(name = "responseMessage")
            private List<ResponseMessage> responseMessage;

            public List<ResponseMessage> getResponseMessage() {
                if (responseMessage == null) {
                    responseMessage = new ArrayList<>();
                }
                return this.responseMessage;
            }

            @Data
            @XmlAccessorType(XmlAccessType.FIELD)
            public static class ResponseMessage {

                @XmlElement(name = "srcSystem")
                private SrcSystem srcSystem;

                @XmlElement(name = "vault")
                private Vault vault;

                @XmlElement(name = "rm")
                private Rm rm;

                @XmlElement(name = "reasonCode")
                private String reasonCode;

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
                public static class Vault {

                    @XmlElement(name = "token")
                    private String token;


                } //Vault

                @Data
                @XmlAccessorType(XmlAccessType.FIELD)
                public static class Rm {

                    @XmlElement(name = "rflag")
                    private String rflag;

                    @XmlElement(name = "rmsg")
                    private String rmsg;


                } //Rm

                @Data
                @XmlAccessorType(XmlAccessType.FIELD)
                public static class CcTokenizeService {

                    @XmlAttribute(name = "run")
                    private Boolean run;

                } //CcTokenizeService
            } //ResponseMessage
        } //ResponseMessages
    } //Body
} //SoapResponse









