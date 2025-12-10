package com.semafone.tndispatcher.model.mn;

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;
import lombok.Data;

import java.util.List;

public class MnXmlResponseModel {
    private MnXmlResponseModel() {
    }
    
    @Data
    @JacksonXmlRootElement(localName = "response")
    public static class MnXmlResponseBody {
        @JacksonXmlElementWrapper(localName = "receipt", useWrapping = false)
        public List<ResponseOperationResult> receipt;
    }

    @JacksonXmlRootElement(localName = "receipt")
    @Data
    public static class ResponseOperationResult {
        @JacksonXmlProperty(localName = "Message")
        public String message;
        @JacksonXmlProperty(localName = "ResponseCode")
        public String responseCode;
        @JacksonXmlProperty(localName = "CardType")
        public String cardType;
        @JacksonXmlProperty(localName = "DataKey")
        public String token;
        @JacksonXmlProperty(localName = "Pan")
        public String accountNumber;
        @JacksonXmlProperty(localName = "MaskedPan")
        public String maskedAccountNumber;
        @JacksonXmlProperty(localName = "ResponseFlag")
        public String responseFlag;

        public String getProperty(MnReceiptProperties propertyEnum) {
            switch (propertyEnum) {
                case TOKEN:
                    return token;
                case CARD_TYPE:
                    return cardType;
                case MASKED_PAN:
                    return maskedAccountNumber;
                case RESPONSE_FLAG:
                    return responseFlag;
                case PAN:
                    return accountNumber;
                default:
                    throw new IllegalArgumentException("Property not recognized:" + propertyEnum.name());
            }
        }
    }


}
