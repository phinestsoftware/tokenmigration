package com.semafone.tndispatcher.model.cs;

import com.google.common.collect.Lists;
import lombok.Getter;

import java.util.Collection;
import java.util.List;

/**
 * Representation of env:Envelope
 */
@Getter
public class CsResponse {
    private final List<CsOperationResult> csOperationResults;

    public CsResponse(Collection<CsOperationResult> csOperationResults) {
        this.csOperationResults = Lists.newArrayList(csOperationResults);
    }
}
