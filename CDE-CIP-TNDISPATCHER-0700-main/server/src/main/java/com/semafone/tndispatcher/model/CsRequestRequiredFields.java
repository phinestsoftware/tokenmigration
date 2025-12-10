package com.semafone.tndispatcher.model;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public enum CsRequestRequiredFields {
    PAN(ResponseStatus.INVALIDNUM),
    CARD_TYPE(ResponseStatus.BADTYPE),
    TOKEN(ResponseStatus.BADTOKEN),
    OPERATION(ResponseStatus.BADREQUEST_INVALIDOPERATION),
    NONE(ResponseStatus.UNKWNERROR);

    private final ResponseStatus responseStatus;

    CsRequestRequiredFields(ResponseStatus responseStatus) {
        this.responseStatus = responseStatus;
    }

    public static CsRequestRequiredFields fromErrorMessageString(String msg) {
        String[] split = msg.split(" ");
        if (split.length > 0) {
            try {
                return CsRequestRequiredFields.valueOf(split[0]);

            } catch (IllegalArgumentException e) {
                //noop
                log.debug("Failed to find CsRequestRequiredFields ", e);
            }
        }
        return NONE;
    }

    public ResponseStatus toResponseStatus() {
        return responseStatus;
    }
}
