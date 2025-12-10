package com.semafone.tndispatcher.model.cs;

import com.semafone.tndispatcher.model.CsToMnRequestMapper;
import lombok.Data;

/**
 * Representation of wsse:UsernameToken
 */
@Data
public class CsCredentials {
    private final String wsuId;
    private final String userName;
    private final String password;

    public void visit(CsToMnRequestMapper csToMnRequestMapper) {
        csToMnRequestMapper.visit(this);

    }
}
