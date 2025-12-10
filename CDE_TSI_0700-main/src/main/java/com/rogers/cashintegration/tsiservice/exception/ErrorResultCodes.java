package com.rogers.cashintegration.tsiservice.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Created by Shankar.Chakraborty on 2023-12-01
 *
 * @author : Shankar.Chakraborty
 * @date : 2023-12-01
 * @project :tsi-service
 **/


@Getter
@AllArgsConstructor
public enum ErrorResultCodes {
    INTERNAL_SERVER_ERROR(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "An internal error was thrown at the Cash Integration platform"
            ),
    RESOURCE_NOT_FOUND(
            HttpStatus.NOT_FOUND.value(),
            "Requested resource not found at the Cash Integration platform. Please ensure the correct request URI is used and try again."
    );

    private final int status;
    private final String error;

}
