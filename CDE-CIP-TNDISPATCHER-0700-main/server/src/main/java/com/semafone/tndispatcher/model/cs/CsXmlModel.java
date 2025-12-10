package com.semafone.tndispatcher.model.cs;

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import lombok.Data;

public class CsXmlModel {
    private CsXmlModel() {
    }
    
    @Data
    public static class SrcSystem{
        @JacksonXmlProperty(localName = "name")
        public String name;
        @JacksonXmlProperty(localName = "sysIndicator")
        public String sysIndicator;
        @JacksonXmlProperty(localName = "messageId")
        public String messageId;
    }

    @Data
    public static class CsUser{
        @JacksonXmlProperty(localName = "userName")
        public String userName;
        @JacksonXmlProperty(localName = "userId")
        public String userId;
    }

    @Data
    public static class CcTokenizeService{
        @JacksonXmlProperty(localName = "run",isAttribute = true)
        public Boolean run;
    }

    @Data
    public static class CcDeTokenizeService{
        @JacksonXmlProperty(localName = "run",isAttribute = true)
        public Boolean run;
    }

    @Data
    public static class CcFirstSixService{
        @JacksonXmlProperty(localName = "run",isAttribute = true)
        public Boolean run;
    }

    @Data
    public static class CcVerifyService{
        @JacksonXmlProperty(localName = "run",isAttribute = true)
        public Boolean run;
    }
}
