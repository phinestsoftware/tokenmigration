package com.semafone.tndispatcher.model.mn;

import com.google.common.collect.Lists;
import lombok.Getter;
import lombok.ToString;

import java.util.Collection;
import java.util.List;

/**
 * Representation of Cybersource Request (xml element: soapenv:Envelope)
 * Moneris requests are always of 'batch' type to simplify XmlRequest template
 */
@Getter
@ToString
public class MnResponse {
    private final List<MnOperationResult> mnOperationResults;

    public MnResponse(Collection<MnOperationResult> mnOperationResults) {
        this.mnOperationResults = Lists.newArrayList(mnOperationResults);
    }
}
