package com.semafone.tndispatcher.cucumber;

import cucumber.api.junit.Cucumber;
import org.junit.runner.RunWith;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.autoconfigure.session.SessionAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

@RunWith(Cucumber.class)
@Component
@EnableAutoConfiguration(exclude = { RedisAutoConfiguration.class, SessionAutoConfiguration.class})
@Configuration
@ComponentScan("com.semafone.tndispatcher")
public class CucumberTestRunner {

}
