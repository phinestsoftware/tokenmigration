package com.semafone.tndispatcher.model;

import lombok.Getter;

@Getter
public class SoapFaultCsException extends IllegalArgumentException {
    private final CsRequestParseException csRequestParseException;
    private final MnResponseParseException mnResponseParseException;
    private final String message;

    public SoapFaultCsException(CsRequestParseException csParseException) {
        this.csRequestParseException = csParseException;
        this.mnResponseParseException = null;
        this.message = csParseException.getMessage();
    }

    public SoapFaultCsException(String message ) {
        this.message = message;
        this.csRequestParseException = null;
        this.mnResponseParseException = null;
    }

    public SoapFaultCsException(MnResponseParseException mnResponseParseException) {
        this.csRequestParseException = null;
        this.mnResponseParseException = mnResponseParseException;
        this.message = mnResponseParseException.getMessage();


    }


    @Override
    public String getMessage() {
        return message;

    }
}
