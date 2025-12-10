package com.semafone.tndispatcher.services.rest.steps;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.common.ConsoleNotifier;
import com.google.common.base.Preconditions;
import com.google.common.collect.Lists;
import com.semafone.tndispatcher.utils.FileUtils;
import com.semafone.tndispatcher.utils.PlaceholderResolver;
import cucumber.api.DataTable;
import cucumber.api.java.Before;
import cucumber.api.java.en.And;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;

public class RestMockStepDefs extends AbstractCucumberTest {
    private static final int mockPort = 7060;
    private static final String mockPrefix = "http://localhost:" + mockPort;
    private static final WireMockServer wireMockServer = new WireMockServer(wireMockConfig().port(mockPort).bindAddress("localhost").notifier(new ConsoleNotifier(true)));
    private final PlaceholderResolver placeholderResolver = new PlaceholderResolver();
    String requestBody = "";
    String responseBody = "";

    @Before
    public static void startServer() {
        wireMockServer.start();
        configureFor("localhost", mockPort);

    }

    @And("^request uses template (.*) and values$")
    public void requestTemplateReplacement(String templateFile, DataTable dataTable) throws Throwable {
        this.requestBody = FileUtils.getFileContentAsString(templateFile);
        System.out.printf("Request template: %s%n", templateFile);

        this.requestBody = placeholderResolver.resolveTemplate(this.requestBody,Lists.newArrayList(dataTable.asMaps(String.class, Object.class)).get(0));
    }
    @And("^request uses file (.*)$")
    public void requestTemplateReplacement(String templateFile) throws Throwable {
        this.requestBody = FileUtils.getFileContentAsString(templateFile);
        System.out.printf("Request template: %s%n", templateFile);

        this.requestBody = placeholderResolver.resolveTemplate(this.requestBody, Collections.emptyMap());
    }

    @And("^response uses template (.*) and values$")
    public void responseTemplateReplacement(String templateFile, DataTable dataTable) throws Throwable {
        this.responseBody = FileUtils.getFileContentAsString(templateFile);
        System.out.printf("Response template: %s%n", templateFile);
        this.responseBody = placeholderResolver.resolveTemplate(responseBody, Lists.newArrayList(dataTable.asMaps(String.class, Object.class)).get(0));
    }


    @And("^the request is stubbed to return (\\d+)$")
    public void thePOSTToUrlIsStubbedToReturn(int responseCode) throws Throwable {
        List<String> placeholders = placeholderResolver.getPlaceholders(this.requestBody);
        Preconditions.checkState(placeholders.isEmpty(), String.format("Request template contains unreplaced placeholders: %s", Arrays.toString(placeholders.toArray())));
        placeholders = placeholderResolver.getPlaceholders(this.responseBody);
        Preconditions.checkState(placeholders.isEmpty(), String.format("Response template contains unreplaced placeholders: %s", Arrays.toString(placeholders.toArray())));


        givenThat(post(urlEqualTo(getDispatcherSupport().getVaultUrl().replace(mockPrefix, "")))
                //withRequestBody(equalTo(requestBody))
                .withHeader("Accept", equalTo("application/xml"))
                .willReturn(aResponse()
                        .withStatus(responseCode)
                        .withHeader("Content-Type", "application/xml")
                        .withBody(responseBody)));
        dispatcherSupport.setRequestBody(requestBody);
    }

    @And("^the request is setup$")
    public void thePostisSetup() throws Throwable {
        List<String> placeholders = placeholderResolver.getPlaceholders(this.requestBody);
        Preconditions.checkState(placeholders.isEmpty(), String.format("Request template contains unreplaced placeholders: %s", Arrays.toString(placeholders.toArray())));
        placeholders = placeholderResolver.getPlaceholders(this.responseBody);
        Preconditions.checkState(placeholders.isEmpty(), String.format("Response template contains unreplaced placeholders: %s", Arrays.toString(placeholders.toArray())));

        dispatcherSupport.setRequestBody(requestBody);
    }
}
