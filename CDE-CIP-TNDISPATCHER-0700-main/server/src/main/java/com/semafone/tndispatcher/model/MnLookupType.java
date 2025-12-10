package com.semafone.tndispatcher.model;

import lombok.Getter;

public enum MnLookupType {
    FIRST6(3, VaultOperation.FIRSTSIX),
    FIRST6_LAST4(2,VaultOperation.UNKNOWN),
    FIRST4_LAST4(1,VaultOperation.UNKNOWN),
    VERIFY(4,VaultOperation.VERIFY);

    @Getter
    private final int code;
    @Getter
    private final VaultOperation vaultOperation;

    MnLookupType(int code, VaultOperation vaultOperation) {
        this.code = code;
        this.vaultOperation = vaultOperation;
    }

    public static MnLookupType fromVaultOperation(VaultOperation operation){
        switch (operation){
            case FIRSTSIX:
                return FIRST6;
            case VERIFY:
                return VERIFY;
            case TOKENIZE:
            case DETOKENIZE:
            case UNKNOWN:
            default:
            throw new EnumConstantNotPresentException(MnLookupType.class,operation.name());
        }
    }
}
