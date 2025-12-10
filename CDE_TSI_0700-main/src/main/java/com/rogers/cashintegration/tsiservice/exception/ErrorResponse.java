package com.rogers.cashintegration.tsiservice.exception;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Created by Shankar.Chakraborty on 2023-12-01
 *
 * @author : Shankar.Chakraborty
 * @date : 2023-12-01
 * @project :tsi-service
 **/


@Getter
@Setter
public class ErrorResponse {
    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String exception;
    private String message;


    public ErrorResponse(int status, String error, String exception, String message) {
        this.timestamp = LocalDateTime.now();
        this.status = status;
        this.error = error;
        this.exception = exception;
        this.message = message;
    }
}

