package com.rogers.cashintegration.tsiservice.exception;

public class ResourceNotFoundException extends RuntimeException{

    private  ErrorResultCodes resultCodes;

    public ResourceNotFoundException() {
    }
    public ResourceNotFoundException(String  message) {
        super(message);
    }
    public ResourceNotFoundException(String message, Throwable cause) {
        super(message,cause);
    }
}
