package com.semafone.tndispatcher;

import com.semafone.tndispatcher.constants.VaultProvider;
import com.semafone.tndispatcher.service.TnRequestDispatcherProvider;
import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class DispatcherSupport {
    private final TnRequestDispatcherProvider requestDispatcherProvider;
    private final String monerisUrl;
    private VaultProvider vaultProvider;
    @Getter
    @Setter
    private String requestBody;

    @Autowired
    public DispatcherSupport(TnRequestDispatcherProvider requestDispatcherProvider,
                             @Value("${semafone.endpoints.moneris}") String monerisUrl,
                             @Value("${semafone.vault.provider}") String vaultProvider
    ) {
        this.requestDispatcherProvider = requestDispatcherProvider;
        this.monerisUrl = monerisUrl;
        this.vaultProvider = VaultProvider.fromString(vaultProvider);
    }

    public void setVault(VaultProvider vaultProvider) {
        this.vaultProvider = vaultProvider;
        requestDispatcherProvider.setVaultProvider(vaultProvider);
    }

    public String getVaultUrl() {
        switch (vaultProvider) {
            case MONERIS:
                return monerisUrl;
        }
        throw new IllegalStateException("vault provider not set");
    }

}
