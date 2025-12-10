package com.rogers.cashintegration.bpsservice.exception;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global exception handler for handling CashIntegrationException.
 *
 * Created by Bhagyashri.Paramane on 2024-02-14
 * @author: Bhagyashri.Paramane
 * @date: 024-02-14
 * @project: bps-service
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
	@Value("${cde.405.response}")
    private String errorMessage;
	
    @ExceptionHandler(CashIntegrationException.class)
    public ResponseEntity<String> handleCashIntegrationException(CashIntegrationException ex) {

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ex.toString());
    }
    
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<String> handleMethodNotSupportedException(HttpRequestMethodNotSupportedException ex) {

        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(errorMessage);
    }
    
}
