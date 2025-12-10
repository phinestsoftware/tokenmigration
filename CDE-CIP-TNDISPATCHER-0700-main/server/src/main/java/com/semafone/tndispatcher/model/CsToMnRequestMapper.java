package com.semafone.tndispatcher.model;

import com.google.common.collect.Lists;
import com.semafone.tndispatcher.model.cs.CsCredentials;
import com.semafone.tndispatcher.model.cs.CsOperation.CsDetokenizeOperation;
import com.semafone.tndispatcher.model.cs.CsOperation.CsFirst6Operation;
import com.semafone.tndispatcher.model.cs.CsOperation.CsTokenizeOperation;
import com.semafone.tndispatcher.model.cs.CsOperation.CsVerifyOperation;
import com.semafone.tndispatcher.model.cs.CsRequest;
import com.semafone.tndispatcher.model.mn.MnCardType;
import com.semafone.tndispatcher.model.mn.MnCredentials;
import com.semafone.tndispatcher.model.mn.MnOperation;
import com.semafone.tndispatcher.model.mn.MnOperation.MnLookupFullOperation;
import com.semafone.tndispatcher.model.mn.MnOperation.MnLookupMaskedOperation;
import com.semafone.tndispatcher.model.mn.MnOperation.MnTokenizeOperation;
import com.semafone.tndispatcher.model.mn.MnRequest;

import java.util.List;


/**
 * Maps Cybersource Request to Moneris Request
 * Visitor pattern is used since we have a hierarchy of operations
 */
public class CsToMnRequestMapper {
    private MnCredentials mnCredentials;
    private List<MnOperation> mnOperations = Lists.newArrayList();

    public static MnRequest mapRequest(CsRequest csRequest) {
        CsToMnRequestMapper mapper = new CsToMnRequestMapper();
        csRequest.visit(mapper);

        return new MnRequest(mapper.mnCredentials, mapper.mnOperations);
    }

    public void visit(CsRequest csRequest) {
        csRequest.getCsCredentials().visit(this);
        csRequest.getCsOperations().forEach(csOp -> csOp.apply(this));
    }


    public void visit(CsCredentials csCredentials) {
        this.mnCredentials = new MnCredentials(csCredentials.getUserName(), csCredentials.getPassword());
    }

    public void visit(CsTokenizeOperation csTokenizeOperation) {
        final MnTokenizeOperation operation = new MnTokenizeOperation(csTokenizeOperation.getIdAndRequest(),
                MnCardType.fromCsCardType(csTokenizeOperation.getCardType()),
                csTokenizeOperation.getAccountNumber()
        );
        mnOperations.add(operation);
    }

    public void visit(CsDetokenizeOperation csDetokenizeOperation) {
        final MnLookupFullOperation operation = new MnLookupFullOperation(csDetokenizeOperation.getIdAndRequest(),
                csDetokenizeOperation.getToken());
        mnOperations.add(operation);
    }

    public void visit(CsFirst6Operation csOperation) {
        final MnLookupMaskedOperation operation = new MnLookupMaskedOperation(csOperation.getIdAndRequest(), MnLookupType.FIRST6,csOperation.getToken());
        mnOperations.add(operation);
    }
    public void visit(CsVerifyOperation csOperation) {
        final MnLookupMaskedOperation operation = new MnLookupMaskedOperation(csOperation.getIdAndRequest(), MnLookupType.VERIFY,csOperation.getToken());
        mnOperations.add(operation);
    }
}
