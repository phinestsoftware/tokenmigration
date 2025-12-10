package com.semafone.tndispatcher.model.mn;

import com.google.common.collect.Lists;
import lombok.Getter;

import java.util.Collection;
import java.util.List;

/**
 * Representation of Cybersource Request (xml element: soapenv:Envelope)
 * Moneris requests are always of 'batch' type to simplify XmlRequest template
 */
@Getter
public class MnRequest {
    private final MnCredentials mnCredentials;
    private final List<MnOperation> mnOperations;

    public MnRequest(MnCredentials mnCredentials, Collection<MnOperation> mnOperations) {
        this.mnCredentials = mnCredentials;
        this.mnOperations = Lists.newArrayList(mnOperations);
    }
}
