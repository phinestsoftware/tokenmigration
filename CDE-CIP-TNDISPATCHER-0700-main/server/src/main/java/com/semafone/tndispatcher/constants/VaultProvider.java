package com.semafone.tndispatcher.constants;

public enum VaultProvider {
    MONERIS;

    public static VaultProvider fromString(String vaultProvider) {
        for(VaultProvider vp: values()){
            if (vp.name().equalsIgnoreCase(vaultProvider)) {
                return vp;
            }
        }
        throw new EnumConstantNotPresentException(VaultProvider.class,vaultProvider);
    }
}
