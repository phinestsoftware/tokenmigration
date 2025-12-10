package com.semafone.tndispatcher.model.mn;

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;
import com.google.common.collect.Lists;
import lombok.Data;
import lombok.Setter;

import java.util.List;

public class MnXmlRequestModel {
    private MnXmlRequestModel() {
    }
    
    @Data
    @JacksonXmlRootElement(localName = "request")
    public static class RequestBody {
        @JacksonXmlProperty(localName = "store_id")
        private String storeId;
        @JacksonXmlProperty(localName = "api_token")
        private String apiToken;
        @JacksonXmlProperty(localName = "res_batch")
        public JacksonXmlWrapper wrapper=new JacksonXmlWrapper();

        public void addOperation(RequestOperation op){
            wrapper.add(op);
        }
    }

    @JacksonXmlRootElement(localName = "abc")
    public static class RequestOperation{
    }

    @Data
    @JacksonXmlRootElement(localName = "res_add_cc")
    public static class RequestTokenizeOperation extends RequestOperation{
        @JacksonXmlProperty(localName = "pan")
        public String accountNumber;
        @JacksonXmlProperty(localName = "card_type")
        public String cardType;
    }

    @Data
    @JacksonXmlRootElement(localName = "res_lookup_full")
    public static class RequestDetokenizeOperation extends RequestOperation{
        @JacksonXmlProperty(localName = "data_key")
        public String token;
    }

    @Data
    @JacksonXmlRootElement(localName = "res_lookup_full")
    public static class RequestFirstSixOperation extends RequestOperation{
        @JacksonXmlProperty(localName = "data_key")
        public String token;
        @JacksonXmlProperty(localName = "lookup_format")
        public int lookupFormat=3;
    }

    @Data
    @JacksonXmlRootElement(localName = "res_lookup_masked")
    public static class RequestVerifyOperation extends RequestOperation{
        @JacksonXmlProperty(localName = "data_key")
        public String token;
        @JacksonXmlProperty(localName = "lookup_format")
        public int lookupFormat=4;
    }


    /**
     * Purpose of this class is to allow unwrapped list content
     * directly under 'res_batch' xml element
     */
    @Setter
    public static class JacksonXmlWrapper {
        @JacksonXmlProperty(localName = "res_add_cc")
        @JacksonXmlElementWrapper(useWrapping = false)
        private List<RequestTokenizeOperation> tOps= Lists.newArrayList();
        @JacksonXmlProperty(localName = "res_lookup_full")
        @JacksonXmlElementWrapper(useWrapping = false)
        private List<RequestDetokenizeOperation> dOps= Lists.newArrayList();
        @JacksonXmlProperty(localName = "res_lookup_masked")
        @JacksonXmlElementWrapper(useWrapping = false)
        private List<RequestOperation> mOps= Lists.newArrayList();

        public void add(RequestOperation op) {
            if(op instanceof RequestTokenizeOperation) {
                tOps.add((RequestTokenizeOperation) op);
                return;
            }
            if(op instanceof RequestDetokenizeOperation) {
                dOps.add((RequestDetokenizeOperation) op);
                return;
            }
            if(op instanceof RequestFirstSixOperation) {
                mOps.add(op);
                return;
            }
            if(op instanceof RequestVerifyOperation) {
                mOps.add(op);
                return;
            }
            throw new IllegalArgumentException(op.getClass().getSimpleName() + " not supported");
        }
    }
}
