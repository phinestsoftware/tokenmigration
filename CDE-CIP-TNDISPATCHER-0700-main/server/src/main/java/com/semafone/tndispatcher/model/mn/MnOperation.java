package com.semafone.tndispatcher.model.mn;

import com.semafone.tndispatcher.model.MnLookupType;
import com.semafone.tndispatcher.model.VaultOperation;
import com.semafone.tndispatcher.model.cs.IdAndRequest;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Representation of urn:requestMessage
 */
@RequiredArgsConstructor
public abstract class MnOperation {
    @Getter
    private final IdAndRequest idAndRequest;
    public abstract  VaultOperation getVaultOperation();

    /**
     * Equivalent of res_add_cc
     */
    @Getter
    public static class MnTokenizeOperation extends MnOperation {
        private final MnCardType cardType;
        private final String accountNumber;

        public MnTokenizeOperation(IdAndRequest idAndRequest,MnCardType cardType, String accountNumber) {
            super(idAndRequest);
            this.cardType = cardType;
            this.accountNumber = accountNumber;
        }

        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.TOKENIZE;
        }
    }

    @Getter
    public static class MnLookupFullOperation extends MnOperation{
        private final String token;

        public MnLookupFullOperation(IdAndRequest idAndRequest, String token) {
            super(idAndRequest);
            this.token = token;
        }

        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.DETOKENIZE;
        }
    }

    @Getter
    public static class MnLookupMaskedOperation extends MnOperation{
        private final MnLookupType mnLookupType;
        private final String token;

        public MnLookupMaskedOperation(IdAndRequest idAndRequest, MnLookupType mnLookupType, String token) {
            super(idAndRequest);
            this.mnLookupType = mnLookupType;
            this.token = token;
        }

        @Override
        public VaultOperation getVaultOperation() {
            return mnLookupType.getVaultOperation();
        }
    }

}
