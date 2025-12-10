package com.semafone.tndispatcher.e2e;

import com.semafone.tndispatcher.cucumber.CucumberTestRunner;
import cucumber.api.CucumberOptions;

@CucumberOptions(format = { "pretty", "html:target/site/cucumber-pretty", "json:target/cucumber-json" },
        features = "target/test-classes/com/semafone/e2e",
        glue = "com.semafone.tndispatcher")
public class RunE2ECucumberTests extends CucumberTestRunner {
}
