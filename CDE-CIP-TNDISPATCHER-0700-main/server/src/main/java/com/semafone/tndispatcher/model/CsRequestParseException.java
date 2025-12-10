package com.semafone.tndispatcher.model;

import com.semafone.tndispatcher.model.cs.CsXmlRequestModel;
import com.semafone.tndispatcher.model.cs.IdAndRequest;
import com.semafone.tndispatcher.model.mn.MnCardType;
import com.semafone.tndispatcher.model.mn.MnOperationResult;

public class CsRequestParseException extends IllegalArgumentException {
    private final VaultOperation operation;
    // Marked as transient to prevent a sonar warning.
    // The correct fix is to restructure this exception and the IdAndRequest class but not possible at this stage of the project. MW 8/5/2017
    private final transient IdAndRequest idAndRequest;
    private final String causeMessage;
    private final CsRequestRequiredFields csRequestRequiredFields;

    public CsRequestParseException(CsXmlRequestModel.RequestMessage msg, IllegalArgumentException e) {
        int noOpsNamed = (msg.getCcTokenizeService() != null ? 11 : 0)
                         + (msg.getCcDeTokenizeService() != null ? 101 : 0)
                         + (msg.getCcFirstSixService() != null ? 1001 : 0)
                         + (msg.getCcVerifyService() != null ? 10001 : 0);
        switch (noOpsNamed) {
            case 11:
                this.operation = VaultOperation.TOKENIZE;
                break;
            case 101:
                this.operation = VaultOperation.DETOKENIZE;
                break;
            case 1001:
                this.operation = VaultOperation.FIRSTSIX;
                break;
            case 10001:
                this.operation = VaultOperation.VERIFY;
                break;
            default:
                this.operation = VaultOperation.UNKNOWN;
        }
        causeMessage = e.getMessage();
        this.csRequestRequiredFields = CsRequestRequiredFields.fromErrorMessageString(causeMessage);
        this.idAndRequest = IdAndRequest.createErrorId(msg);
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
                return new MnOperationResult.MnTokenizeOperationResult(idAndRequest, csRequestRequiredFields.toResponseStatus(), MnCardType.N, "n/a");
            case DETOKENIZE:
                return new MnOperationResult.MnLookupFullOperationResult(idAndRequest, csRequestRequiredFields.toResponseStatus(), MnCardType.N, "n/a");
            case FIRSTSIX:
            case VERIFY:
                return new MnOperationResult.MnLookupMaskedOperationResult(idAndRequest, csRequestRequiredFields.toResponseStatus(),
                                MnLookupType.fromVaultOperation(operation),
                                MnCardType.N, "n/a", "n/a");
            default:
                throw new IllegalStateException("Invalid operation: " + operation.name());
        }
    }

    public boolean isBusinessError() {
        return this.csRequestRequiredFields.toResponseStatus().isBusinessError();
    }
}
