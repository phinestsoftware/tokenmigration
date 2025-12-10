package com.semafone.tndispatcher.model.cs;

import com.google.common.collect.Lists;
import com.semafone.tndispatcher.model.CsToMnRequestMapper;
import lombok.Getter;

import java.util.Collection;
import java.util.List;

/**
 * Representation of Cybersource Request (xml element: soapenv:Envelope)
 */
@Getter
public class CsRequest {
    private final CsCredentials csCredentials;
    private final List<CsOperation> csOperations;

    public CsRequest(CsCredentials csCredentials, Collection<CsOperation> csOperations) {
        this.csCredentials = csCredentials;
        this.csOperations = Lists.newArrayList(csOperations);
    }

    public void visit(CsToMnRequestMapper mapper) {
        mapper.visit(this);
    }
}
