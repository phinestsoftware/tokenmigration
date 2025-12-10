package com.rogers.cashintegration.bpsservice.dto;

import jakarta.xml.bind.annotation.*;
import lombok.Data;
import java.util.List;

/**
 * @author: Shankar.Chakraborty
 * @project: cs-process
 */

@Data
@XmlRootElement(name = "CSProcessResponse")
@XmlAccessorType(XmlAccessType.FIELD)
public class CSProcessResponse {

    @XmlElement(name = "isSuccessful")
    private boolean isSuccessful;

    @XmlElementWrapper(name = "SuccessfulEntries")
    @XmlElement(name = "TokenPanEntry")
    private List<TokenPanEntry> successfulEntries;

    @XmlElementWrapper(name = "FailedEntries")
    @XmlElement(name = "TokenPanEntry")
    private List<TokenPanEntry> failedEntries;

    @XmlElement(name = "SoapFault")
    private soapFault soapFault;

    @XmlElement(name = "cashIntegrationException")
    private cashIntegrationException cashIntegrationException;

    @Data
    @XmlAccessorType(XmlAccessType.FIELD)
    public static class soapFault {
        @XmlElement(name = "FaultCode")
        private String faultCode;
        @XmlElement(name = "FaultString")
        private String faultString;
    }

    @Data
    @XmlAccessorType(XmlAccessType.FIELD)
    public static class cashIntegrationException {

        @XmlElement(name = "errorDesc")
        private String errorDesc;

        @XmlElement(name = "errorDetails")
        private String errorDetails;

        @XmlElement(name = "cashIntegrationErrorCode")
        private cashIntegrationErrorCode cashIntegrationErrorCode;

        @Data
        @XmlAccessorType(XmlAccessType.FIELD)
        public static class cashIntegrationErrorCode {
            @XmlElement(name = "code")
            private String code;
            @XmlElement(name = "desc")
            private String desc;
            @XmlElement(name = "remedy")
            private String remedy;
        }
    }
}


