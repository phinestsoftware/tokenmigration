package com.semafone.tndispatcher.services.rest;

import com.semafone.tndispatcher.cucumber.CucumberTestRunner;
import cucumber.api.CucumberOptions;

@CucumberOptions(format = { "pretty", "html:target/site/cucumber-pretty", "json:target/cucumber-json" },
        features = "target/test-classes/com/semafone/tndispatcher",
        glue = "com.semafone.tndispatcher")
public class RunCucumberTests extends CucumberTestRunner {
}
