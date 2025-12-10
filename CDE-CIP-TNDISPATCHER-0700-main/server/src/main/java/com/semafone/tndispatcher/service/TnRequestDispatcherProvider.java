package com.semafone.tndispatcher.service;

import com.semafone.tndispatcher.constants.VaultProvider;
import lombok.Getter;
import lombok.Setter;

public class TnRequestDispatcherProvider {

    private final TnRequestDispatcher monerisDispatcher;

    @Getter
    @Setter
    private VaultProvider vaultProvider;

    public TnRequestDispatcherProvider(
            TnMonerisRequestDispatcher monerisRequestDispatcher,
            String vaultProvider
    ) {
        this.monerisDispatcher = monerisRequestDispatcher;
        this.vaultProvider = VaultProvider.fromString(vaultProvider);
    }

    public TnRequestDispatcher getDispatcher() {
        if (vaultProvider == VaultProvider.MONERIS) {
            return monerisDispatcher;
        }
        throw new IllegalStateException(String.format("No dispatcher found for selected vault vaultProvider [%s]", String.valueOf(vaultProvider)));
    }
}
