package com.semafone.tndispatcher.model;

import com.semafone.tndispatcher.model.cs.CsOperation;
import com.semafone.tndispatcher.model.cs.IdAndRequest;
import com.semafone.tndispatcher.model.mn.MnCardType;
import com.semafone.tndispatcher.model.mn.MnOperationResult;

public class MnResponseParseException extends IllegalArgumentException {
    private final VaultOperation operation;
    // Marked as transient to prevent a sonar warning.
    // The correct fix is to restructure this exception and the IdAndRequest class but not possible at this stage of the project. MW 8/5/2017
    private final transient IdAndRequest idAndRequest;
    private final String causeMessage;
    private final MnResponseRequiredFields requiredFields;

    public MnResponseParseException(CsOperation csOperation, IllegalArgumentException e) {

        causeMessage = e.getMessage();
        this.requiredFields = MnResponseRequiredFields.fromErrorMessageString(causeMessage);
        this.idAndRequest = csOperation.getIdAndRequest();
        this.operation = csOperation.getVaultOperation();
    }

    @Override
    public String getMessage() {
        return "Error details ["
               + "operation=" + operation.name()
               + ",messageId=" + idAndRequest.getMessageId()
               + ",causeMessage=" + causeMessage
               + "]";
    }

    public MnOperationResult asMnOperationResult() {
        switch (operation) {
            case UNKNOWN:
            case TOKENIZE:
                return new MnOperationResult.MnTokenizeOperationResult(idAndRequest, requiredFields.toResponseStatus(), MnCardType.N, "n/a");
            case DETOKENIZE:
                return new MnOperationResult.MnLookupFullOperationResult(idAndRequest, requiredFields.toResponseStatus(), MnCardType.N, "n/a");
            case FIRSTSIX:
            case VERIFY:
                return new MnOperationResult.MnLookupMaskedOperationResult(idAndRequest, requiredFields.toResponseStatus(),
                        MnLookupType.fromVaultOperation(operation),
                        MnCardType.N, "n/a", "n/a");
            default:
                throw new IllegalStateException("Invalid operation: " + operation.name());
        }
    }

    public boolean isBusinessError() {
        return this.requiredFields.toResponseStatus().isBusinessError();
    }
}
