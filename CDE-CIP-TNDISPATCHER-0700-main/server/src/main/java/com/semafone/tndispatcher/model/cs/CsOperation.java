package com.semafone.tndispatcher.model.cs;

import com.semafone.tndispatcher.model.CsToMnRequestMapper;
import com.semafone.tndispatcher.model.VaultOperation;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Representation of urn:requestMessage
 */
@RequiredArgsConstructor
public abstract class CsOperation {
    @Getter
    private final IdAndRequest idAndRequest;
    @Getter
    private final boolean runService;


    public abstract VaultOperation getVaultOperation();

    public abstract void apply(CsToMnRequestMapper csToMnRequestMapper);

    @Getter
    public static class CsTokenizeOperation extends CsOperation{
        private final CsCardType cardType;
        private final String accountNumber;
        private final int expirationYear;
        private final int expirationMonth;

        public CsTokenizeOperation(IdAndRequest idAndRequest, CsCardType cardType, String accountNumber, int expirationYear, int expirationMonth, boolean runService) {
            super(idAndRequest,runService);
            this.cardType = cardType;
            this.accountNumber = accountNumber;
            this.expirationYear = expirationYear;
            this.expirationMonth = expirationMonth;
        }

        @Override
        public void apply(CsToMnRequestMapper csToMnRequestMapper) {
            csToMnRequestMapper.visit(this);
        }
        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.TOKENIZE;
        }

    }

    @Getter
    public abstract static class CsOperationWithToken extends CsOperation{
        private final String token;

        public CsOperationWithToken(IdAndRequest idAndRequest, boolean runService,String token) {
            super(idAndRequest, runService);
            this.token = token;
        }
    }
    @Getter
    public static class CsDetokenizeOperation extends CsOperationWithToken{

        public CsDetokenizeOperation(IdAndRequest idAndRequest, String token, boolean runService) {
            super(idAndRequest,runService,token);
        }
        @Override
        public void apply(CsToMnRequestMapper csToMnRequestMapper) {
            csToMnRequestMapper.visit(this);
        }

        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.DETOKENIZE;
        }
    }

    @Getter
    public static class CsFirst6Operation extends CsOperationWithToken{

        public CsFirst6Operation(IdAndRequest idAndRequest, String token, boolean runService) {
            super(idAndRequest,runService,token);
        }
        @Override
        public void apply(CsToMnRequestMapper csToMnRequestMapper) {
            csToMnRequestMapper.visit(this);
        }

        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.FIRSTSIX;
        }
    }

    @Getter
    public static class CsVerifyOperation extends CsOperationWithToken{

        public CsVerifyOperation(IdAndRequest idAndRequest, String token, boolean runService) {
            super(idAndRequest,runService,token);
        }
        @Override
        public void apply(CsToMnRequestMapper csToMnRequestMapper) {
            csToMnRequestMapper.visit(this);
        }

        @Override
        public VaultOperation getVaultOperation() {
            return VaultOperation.VERIFY;
        }
    }

}
