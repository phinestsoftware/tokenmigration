package com.semafone.tndispatcher.model.cs;

import com.semafone.tndispatcher.model.ResponseStatus;
import com.semafone.tndispatcher.model.VaultOperation;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Representation of urn:responseMessage
 */
@RequiredArgsConstructor
public abstract class CsOperationResult {
    @Getter
    private final IdAndRequest idAndRequest;
    @Getter
    private final ResponseStatus responseStatus;


    public abstract VaultOperation getVaultOperation();

    @Getter
    public static class CsTokenizeOperationResult extends CsOperationResult {
        private final String token;

        public CsTokenizeOperationResult(IdAndRequest idAndRequest, String token, ResponseStatus responseStatus) {
            super(idAndRequest, responseStatus);
            this.token = token;
        }

        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.TOKENIZE;
        }
    }

    @Getter
    public static class CsDetokenizeOperationResult extends CsOperationResult {
        private final CsCardType cardType;
        private final String creditCardNumber;

        public CsDetokenizeOperationResult(IdAndRequest idAndRequest, CsCardType cardType, String creditCardNumber, ResponseStatus responseStatus) {
            super(idAndRequest, responseStatus);
            this.cardType = cardType;
            this.creditCardNumber = creditCardNumber;
        }

        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.DETOKENIZE;
        }
    }

    @Getter
    public static class CsFirst6OperationResult extends CsOperationResult {
        private final CsCardType cardType;
        private final String panFirst6;

        public CsFirst6OperationResult(IdAndRequest idAndRequest, CsCardType cardType, String panFirst6, ResponseStatus responseStatus) {
            super(idAndRequest, responseStatus);
            this.cardType = cardType;
            this.panFirst6 = panFirst6;
        }

        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.FIRSTSIX;
        }
    }

    @Getter
    public static class CsVerifyOperationResult extends CsOperationResult {
        private final CsCardType cardType;
        private final String token;
        private final boolean accepted;

        public CsVerifyOperationResult(IdAndRequest idAndRequest, CsCardType cardType, ResponseStatus responseStatus,String token) {
            super(idAndRequest, responseStatus);
            this.cardType = cardType;
            this.token = token;
            this.accepted = responseStatus == ResponseStatus.OK;
        }

        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.VERIFY;
        }
    }

}
