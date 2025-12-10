package com.semafone.tndispatcher.model.mn;

import lombok.Data;

/**
 * Representation of wsse:UsernameToken
 */
@Data
public class MnCredentials {
    private final String storeId;
    private final String apiToken;
}
