package com.semafone.tndispatcher.config;

import com.semafone.tndispatcher.service.TnMonerisRequestDispatcher;
import com.semafone.tndispatcher.service.TnRequestDispatcherProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DispatcherConfig {

    @Autowired
    private TnMonerisRequestDispatcher monerisRequestDispatcher;


    @Value("${semafone.vault.provider}")
    private String vaultProvider;

    @Bean
    TnRequestDispatcherProvider getTnRequestDispatcherProvider() {
        return new TnRequestDispatcherProvider(monerisRequestDispatcher, vaultProvider);
    }
}
