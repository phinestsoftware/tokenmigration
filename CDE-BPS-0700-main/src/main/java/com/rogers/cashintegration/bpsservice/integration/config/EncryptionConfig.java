package com.rogers.cashintegration.bpsservice.integration.config;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.jasypt.encryption.StringEncryptor;
import org.jasypt.encryption.pbe.StandardPBEStringEncryptor;
import org.jasypt.encryption.pbe.config.EnvironmentStringPBEConfig;
import org.jasypt.spring31.properties.EncryptablePropertyPlaceholderConfigurer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import com.rogers.cashintegration.bpsservice.service.impl.BpsFileProcessServiceImpl;

/**
 * Configuration class for encryption-related configurations.
 * Provides beans for string encryption and property placeholder configuration with encryption.
 *
 * @author Shankar.Chakraborty
 * @project cs-process
 */

@Configuration
public class EncryptionConfig {
	private static final Logger logger = LoggerFactory.getLogger(EncryptionConfig.class);
    /**
     * Configures and returns a StringEncryptor bean for encrypting strings.
     */
    @Bean(name = "encryptorBean")
    public StringEncryptor stringEncryptor(Environment environment) {
        EnvironmentStringPBEConfig config = new EnvironmentStringPBEConfig();
        config.setAlgorithm("PBEWITHSHA256AND256BITAES-CBC-BC");
        config.setPassword(environment.getProperty("MULE_ENCRYPTION_PASSWORD"));
        config.setStringOutputType("hexadecimal");
        config.setProvider(new BouncyCastleProvider());
        StandardPBEStringEncryptor encryptor = new StandardPBEStringEncryptor();
        encryptor.setConfig(config);
        return encryptor;
    }

    /**
     * Configures and returns an EncryptablePropertyPlaceholderConfigurer bean.
     */
    @Bean(name = "propertyConfigurer")
    public EncryptablePropertyPlaceholderConfigurer encryptablePropertyPlaceholderConfigurer(Environment environment) {
        EncryptablePropertyPlaceholderConfigurer configurer = new EncryptablePropertyPlaceholderConfigurer(stringEncryptor(environment));

        // Check if default property file exists
        Resource defaultResource = new FileSystemResource("/pkg/bps/config/bps-default.properties");
        if (defaultResource.exists()) {
            logger.info("Loading bps-default.properties file");
            configurer.setLocations(defaultResource);
        } else {
            logger.info("Loading application.properties file");
            configurer.setLocations(new ClassPathResource("application.properties"));
        }
        return configurer;
    }
}
