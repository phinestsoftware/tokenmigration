package com.rogers.cce;

import com.rogers.cce.creditoption.services.resource.ResourceLoaderService;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.ComponentScan;

import java.util.Properties;

@SpringBootApplication
@ComponentScan(basePackages = "com.rogers")
@OpenAPIDefinition(info = @Info(
        title = "CCE-MS-CreditOptions",
        description = "CCE-MS-CreditOptions",
        contact = @Contact(name = ""),
        license = @License(name = ""),
        version = "V1.0"))
public class Application {
    private static final Logger logger = LoggerFactory.getLogger(Application.class);

    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(Application.class);
        new Application().setPropertyValue(application);
        application.run();
        logger.info("========================CCE-CreditOptions Micro Services Started=============================");
    }

    public void setPropertyValue(SpringApplication application) {
        @SuppressWarnings("resource")
        ApplicationContext ctx = new AnnotationConfigApplicationContext("com.rogers.cce.creditoption.services.resource");
        ResourceLoaderService loader = (ResourceLoaderService) ctx.getBean("resourceLoaderService");
        String cosmosDBUserName = "";
        String cosmosDBUserKey = "";
        String aesEncryptionIV = "";
        String aesEncryptionKey = "";
        String appInsightsIntrumentationKey="";

        try {
            cosmosDBUserName = loader.getCosmosDBCassandraConnectionUserName();
            cosmosDBUserKey = loader.getCosmosDBCassandraConnectionPassword();
            aesEncryptionIV = loader.getAesEncryptionIVIN();
            aesEncryptionKey = loader.getAesEncryptionKeyIN();
            appInsightsIntrumentationKey=loader.getAppInsightsIntrumentationKey();
        } catch (Exception e) {
            logger.error("Exception in extracting values of azure key vault " + e);
        }

        Properties properties = new Properties();
        if (cosmosDBUserName != null) {
            properties.put("spring.data.cassandra.username", cosmosDBUserName);
        }
        if (cosmosDBUserKey != null) {
            properties.put("spring.data.cassandra.password", cosmosDBUserKey);
        }
        if(aesEncryptionIV != null){
            properties.put("secret.encryptionKeyIv",aesEncryptionIV);
        }
        if(aesEncryptionKey != null){
            properties.put("secret.encryptionKey",aesEncryptionKey);
        }
        if(appInsightsIntrumentationKey!=null){
            properties.put("azure.application-insights.instrumentation-key",appInsightsIntrumentationKey);
        }

        application.setDefaultProperties(properties);
    }
}
