package com.rogers.cashintegration.tsiservice.exception;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Created by Shankar.Chakraborty on 2023-12-01
 *
 * @author : Shankar.Chakraborty
 * @date : 2023-12-01
 * @project :tsi-service
 **/

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InternalServerErrorException.class)
    public ResponseEntity<ErrorResponse> handleInternalServerErrorException(InternalServerErrorException ex) {
        ErrorResultCodes resultCodes = ErrorResultCodes.INTERNAL_SERVER_ERROR;

        // Create an error response object with a timestamp
        ErrorResponse errorResponse = new ErrorResponse(
                resultCodes.getStatus(),
                resultCodes.getError(),
                ex.toString(),
                ex.getMessage()
        );

        // Return the error response with an appropriate status code
        return ResponseEntity.status(resultCodes.getStatus()).body(errorResponse);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex) {
        ErrorResultCodes resultCodes = ErrorResultCodes.RESOURCE_NOT_FOUND;
        ErrorResponse errorResponse = new ErrorResponse(
                resultCodes.getStatus(),
                resultCodes.getError(),
                ex.toString(),
                ex.getMessage()
        );

        // Return the error response with an appropriate status code
        return ResponseEntity.status(resultCodes.getStatus()).body(errorResponse);
    }
}
