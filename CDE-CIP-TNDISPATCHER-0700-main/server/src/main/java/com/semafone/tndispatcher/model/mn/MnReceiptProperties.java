package com.semafone.tndispatcher.model.mn;

import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Sets;
import com.semafone.tndispatcher.model.VaultOperation;

import java.util.Collections;
import java.util.Set;

public enum MnReceiptProperties {
    TOKEN, CARD_TYPE, MASKED_PAN, RESPONSE_FLAG, PAN;

    private static final Set<MnReceiptProperties> asSet;
    static {
        Set<MnReceiptProperties> set = Sets.newTreeSet();
        Collections.addAll(set, values());
        asSet = Collections.unmodifiableSet(set);
    }
    /**
     * an instance of set containing all values
     */
    public static Set<MnReceiptProperties> asSet() {
        return asSet;
    }

    public static Set<MnReceiptProperties> getRequiredProperties(VaultOperation vaultOp) {
        switch (vaultOp) {
            case TOKENIZE:
                return ImmutableSet.of(TOKEN, CARD_TYPE, RESPONSE_FLAG);
            case DETOKENIZE:
                return ImmutableSet.of(TOKEN, CARD_TYPE, RESPONSE_FLAG, PAN);
            case FIRSTSIX:
                return ImmutableSet.of(TOKEN, CARD_TYPE, RESPONSE_FLAG, MASKED_PAN);
            case VERIFY:
                return ImmutableSet.of(TOKEN, CARD_TYPE, RESPONSE_FLAG);
            default:
                throw new IllegalArgumentException("Vault operation not supported: "+vaultOp.name());
        }
    }

    public static Set<MnReceiptProperties> getOptionalProps(VaultOperation vaultOp) {
        switch (vaultOp) {
            case TOKENIZE:
                return ImmutableSet.of(MASKED_PAN);
            case DETOKENIZE:
                return ImmutableSet.of(MASKED_PAN);
            case FIRSTSIX:
                return ImmutableSet.of();
            case VERIFY:
                return ImmutableSet.of(MASKED_PAN);
            default:
                throw new IllegalArgumentException("Vault operation not supported: "+vaultOp.name());
        }
    }
}
