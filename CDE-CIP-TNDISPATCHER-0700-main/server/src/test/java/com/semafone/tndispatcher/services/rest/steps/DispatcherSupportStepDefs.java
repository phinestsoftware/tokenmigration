package com.semafone.tndispatcher.services.rest.steps;

import com.semafone.tndispatcher.constants.VaultProvider;
import cucumber.api.java.Before;
import cucumber.api.java.en.Given;

public class DispatcherSupportStepDefs extends AbstractCucumberTest {

    @Before
    public void beforeTest() {
        clearResponseData();
    }

    @Given("^The application target vault is set to (.*)$")
    public void a_http_response_code_is_returned(String vaultProvider) throws Throwable {
        VaultProvider provider = VaultProvider.fromString(vaultProvider);

        dispatcherSupport.setVault(provider);
    }


}
