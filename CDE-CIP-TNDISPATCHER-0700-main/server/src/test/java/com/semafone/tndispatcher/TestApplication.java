//@formatter:off
package com.semafone.tndispatcher;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.session.SessionAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties
@SpringBootApplication(exclude = {SessionAutoConfiguration.class})
@EnableCaching
public class TestApplication {
    public static class TestApplication2 extends TestApplication {
    }
}
