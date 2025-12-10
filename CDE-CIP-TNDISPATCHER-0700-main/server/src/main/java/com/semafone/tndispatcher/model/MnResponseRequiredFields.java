package com.semafone.tndispatcher.model;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public enum MnResponseRequiredFields {
    RESPONSE_CODE(ResponseStatus.UNKWNERROR),
    MESSAGE(ResponseStatus.UNKWNERROR),
    NONE(ResponseStatus.UNKWNERROR);

    private final ResponseStatus responseStatus;

    MnResponseRequiredFields(ResponseStatus responseStatus) {
        this.responseStatus = responseStatus;
    }

    public static MnResponseRequiredFields fromErrorMessageString(String msg) {
        String[] split = msg.split(" ");
        if (split.length > 0) {
            try {
                return MnResponseRequiredFields.valueOf(split[0]);

            } catch (IllegalArgumentException e) {
                //noop
                log.debug("Failed to find MnResponseRequiredFields " , e );
            }
        }
        return NONE;
    }

    public ResponseStatus toResponseStatus() {
        return responseStatus;
    }
}
