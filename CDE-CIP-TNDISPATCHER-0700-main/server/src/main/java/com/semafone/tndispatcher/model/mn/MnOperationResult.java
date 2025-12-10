package com.semafone.tndispatcher.model.mn;

import com.semafone.tndispatcher.model.MnLookupType;
import com.semafone.tndispatcher.model.MnToCsResponseMapper;
import com.semafone.tndispatcher.model.ResponseStatus;
import com.semafone.tndispatcher.model.VaultOperation;
import com.semafone.tndispatcher.model.cs.IdAndRequest;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

/**
 * Representation of urn:requestMessage
 */
@RequiredArgsConstructor
@ToString
public abstract class MnOperationResult {
    @Getter
    private final IdAndRequest csIdAndRequest;
    @Getter
    private final ResponseStatus responseStatus;
    @Getter
    private final MnCardType cardType;

    public abstract VaultOperation getVaultOperation();

    public abstract void apply(MnToCsResponseMapper mapper);

    /**
     * Equivalent of res_add_cc
     */
    @Getter
    @ToString(callSuper = true)
    public static class MnTokenizeOperationResult extends MnOperationResult {
        private final String token;

        public MnTokenizeOperationResult(IdAndRequest idAndRequest, ResponseStatus responseStatus, MnCardType cardType, String token) {
            super(idAndRequest, responseStatus,cardType);
            this.token = token;
        }

        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.TOKENIZE;
        }

        @Override
        public void apply(MnToCsResponseMapper mapper) {
            mapper.visit(this);
        }


    }

    /**
     * Equivalent of res_lookup_full
     */
    @Getter
    @ToString(callSuper = true)
    public static class MnLookupFullOperationResult extends MnOperationResult {
        private final String pan;

        public MnLookupFullOperationResult(IdAndRequest idAndRequest, ResponseStatus responseStatus, MnCardType cardType, String pan) {
            super(idAndRequest, responseStatus,cardType);
            this.pan = pan;
        }

        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.DETOKENIZE;
        }

        @Override
        public void apply(MnToCsResponseMapper mapper) {
            mapper.visit(this);
        }
    }

    @Getter
    @ToString(callSuper = true)
    public static class MnLookupMaskedOperationResult extends MnOperationResult {
        private final MnLookupType lookupType;
        private final String token;
        private final String partialPan;

        public MnLookupMaskedOperationResult(IdAndRequest idAndRequest, ResponseStatus responseStatus, MnLookupType lookupType, MnCardType cardType, String partialPan,String token) {
            super(idAndRequest, responseStatus,cardType);
            this.partialPan = partialPan;
            this.lookupType = lookupType;
            this.token=token;
        }

        @Override
        public VaultOperation getVaultOperation() {
            return lookupType.getVaultOperation();
        }

        @Override
        public void apply(MnToCsResponseMapper mapper) {
            mapper.visit(this);
        }
    }

}
