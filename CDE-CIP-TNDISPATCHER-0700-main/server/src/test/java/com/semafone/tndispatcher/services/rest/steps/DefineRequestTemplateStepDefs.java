package com.semafone.tndispatcher.services.rest.steps;

import com.semafone.tndispatcher.utils.FileUtils;
import cucumber.api.java.Before;
import cucumber.api.java.en.Given;
import org.codehaus.jettison.json.JSONObject;

public class DefineRequestTemplateStepDefs extends AbstractCucumberTest {

    private JSONObject requestTemplateJson;

    @Before
    public void beforeScenario() throws Exception {
        clearResponseData();
    }

    @Given("^The request template is loaded to object from the file: (.*)$")
    public void theApplicationModelIsLoadedToObjectFromFile(String jsonFilePath) throws Throwable {
        String json = FileUtils.getFileContentAsString(jsonFilePath);
        requestTemplateJson = new JSONObject(json);
    }

    @Given("^The environment property \"([^\"]*)\" is set to \"([^\"]*)\"$")
    public void theEnvironmentPropertyIsSetTo(String propertyName, String propertyValue) throws Throwable {
        System.setProperty(propertyName, propertyValue);
    }
}
