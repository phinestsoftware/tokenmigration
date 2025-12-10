package com.rogers.cashintegration.tsiservice.exception;

/**
 * Created by Shankar.Chakraborty on 2023-12-01
 *
 * @author : Shankar.Chakraborty
 * @date : 2023-12-01
 * @project :tsi-service
 **/



public class InternalServerErrorException extends  RuntimeException{

    public InternalServerErrorException() {
    }
    public InternalServerErrorException(String message) {
        super(message);
    }

    public InternalServerErrorException(String message, Throwable cause) {
        super(message, cause);
    }
}
