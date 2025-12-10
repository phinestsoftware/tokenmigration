package com.semafone.tndispatcher.services.rest.steps;

import com.google.common.base.Splitter;
import com.google.common.base.Strings;
import com.google.common.base.Throwables;
import com.google.common.collect.Maps;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import com.semafone.tndispatcher.utils.DataMatchingUtil;
import cucumber.api.DataTable;
import cucumber.api.java.Before;
import cucumber.api.java.en.And;
import cucumber.api.java.en.Then;
import cucumber.api.java.en.When;
import net.minidev.json.JSONArray;
import net.minidev.json.JSONObject;
import net.minidev.json.parser.JSONParser;
import org.json.XML;
import org.junit.Assert;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import static com.google.common.base.Preconditions.checkNotNull;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class DispatchRequestStepDefs extends AbstractCucumberTest {

    @Before
    public void beforeTest() {
        clearResponseData();
    }

    @When("^The dispatch end point is called for (.*) with POST$")
    public void theDispatchEndPointIsCalledWithPOST(String path) throws Throwable {
        theDispatchEndPointIsCalledWithPOSTAndBody(path, null);
    }

    @When("^The dispatch end point is called for (.*) with DELETE")
    public void theDispatchEndPointIsCalledWithDELETE(String path) throws Throwable {
        executeDelete(replaceInPath(path));
    }

    @When("^The dispatch end point is called for (.*) with POST and payload$")
    public void theDispatchEndPointIsCalledWithPOSTAndBody(String path, DataTable dataTable) throws Throwable {
        callWithMethodAndBody(HttpMethod.POST, path.trim(), dataTable, Collections.EMPTY_MAP);
    }

    @When("^The dispatch end point is called for (.*) with POST and headers: (.*) and payload$")
    public void theDispatchEndPointIsCalledWithHeadersPOSTAndBody(String path, String headers, DataTable dataTable) throws Throwable {
        callWithMethodAndBody(HttpMethod.POST, path, dataTable, parseHeaders(headers));
    }

    @When("^The dispatch end point is called for (.*) with PUT and payload$")
    public void theDispatchEndPointIsCalledWithPUTAndBody(String path, DataTable dataTable) throws Throwable {
        callWithMethodAndBody(HttpMethod.PUT, path, dataTable, Collections.EMPTY_MAP);
    }

    /**
     * The headers string should look like: header1=val1,val2;header2=val1
     *
     * @param headers
     * @return
     */
    private Map<String, List<String>> parseHeaders(String headers) {
        Map<String, List<String>> httpHeaders = new HashMap<>();
        for (String header : headers.split(";")) {
            String[] headerComp = header.split("=");
            httpHeaders.put(headerComp[0], Arrays.asList(headerComp[1].split(",")));
        }
        return httpHeaders;
    }


    private void callWithMethodAndBody(HttpMethod method, String path, DataTable dataTable, Map<String, List<String>> headers) throws Throwable {
        if (dataTable == null) {
            executeRequest(method, replaceInPath(path), "{}", headers);
        } else {
            final List<Map<String, String>> maps = dataTable.asMaps(String.class, String.class);
            Map<String, String> row = maps.get(0);
            Map<String, Object> rowReplaced = Maps.newHashMap(row);

            row.entrySet().stream()
                    .filter(e -> !Strings.isNullOrEmpty(e.getValue()) && e.getValue().length() > 6 && e.getValue().contains(":"))
                    .forEach(e -> {
                        final String[] split = e.getValue().trim().split(":");
                        String prefix = split[0];
                        String number = split[1];
                        try {
                            switch (prefix) {
                                case "integer":
                                    rowReplaced.put(e.getKey(), Integer.parseInt(number));
                                    break;
                                case "number":
                                    Double.parseDouble(number);
                                    Integer.parseInt(number.replace(".", ""));
                                    //rowReplaced.put(e.getKey(), new BigDecimal(number));
                                    rowReplaced.put(e.getKey(), Double.parseDouble(number));
                                    break;
                            }
                        } catch (NumberFormatException noReplacement) {
                        }
                    });
            String body = new JSONObject(rowReplaced).toString();
            executeRequest(method, replaceInPath(path), body, headers);
        }
    }

    @When("^dispatch endpoint is called with templated request$")
    public void dispatchRequestPostCall() throws Throwable {
        executePost("", checkNotNull(getDispatcherSupport().getRequestBody()));
    }


    @Then("^The response code is (\\d+)$")
    public void theResponseCodeIs(int responseCode) throws Throwable {
        assertEquals(HttpStatus.valueOf(responseCode), getResponseData().statusCode);

    }

    @And("^The response body contains for path (.*) an object which looks like$")
    public void theResponseBodyContainsForThePathAnObject(String xmlPath, DataTable dataTable) throws Throwable {
        String responseBodyJson = XML.toJSONObject(getResponseData().responseBody).toString();
        try {
            Map<String, Object> subTree = JsonPath.read(responseBodyJson, xmlPath);
            Map<String, Object> dataMap = replacePlaceholders(dataTable).get(0);

            DataMatchingUtil.validateDataAgainstResponse(dataMap, subTree);
        } catch (PathNotFoundException e) {
            System.out.println(responseBodyJson);
            throw Throwables.propagate(e);
        }
    }

    @And("^The response body contains for the path (.*) an object which matches the expression (.*)$")
    public void theResponseBodyContainsForThePathAnObjectMatchingExpression(String path, String expression) throws Throwable {
        ResponseData responseData = getResponseData();
        String jsonObject = JsonPath.read(responseData.responseBody, path).toString();
        assertTrue(jsonObject + " didn't match regular expression " + expression,
                Pattern.matches(expression, jsonObject));
    }

    @And("^The response body doesn't contain the keys for the path (.*)$")
    public void theResponseBodyDoesNotContain(String path, DataTable dataTable) throws Throwable {
        Map<String, Object> jsonObject = JsonPath.read(getResponseData().responseBody, path);
        List<String> dataList = dataTable.asList(String.class);
        for (String key : dataList) {
            Assert.assertNull(String.format("Did not expect to find key [%s] on path [].", key, path), jsonObject.get(key));
        }
    }

    @And("^The response contains the keys for the path (.*)$")
    public void theResponseBodyContainsKeys(String path, DataTable dataTable) throws Throwable {
        Map<String, Object> jsonObject = JsonPath.read(getResponseData().responseBody, path);
        List<String> dataList = dataTable.asList(String.class);
        for (String key : dataList) {
            Assert.assertNotNull(jsonObject.get(key));
        }
    }

    @And("^The response body contains for the path (.*) an array the entries:$")
    public void theResponseBodyContainsForThePathAnArray(String path, DataTable dataTable) throws Throwable {
        List<String> array = JsonPath.read(getResponseData().responseBody, path);
        List<String> dataAsList = dataTable.asList(String.class);
        Assert.assertEquals(dataAsList, array);
    }

    @Then("^The response body at \"([^\"]*)\" is an array of objects and it does not have \"([^\"]*)\" property$")
    public void the_response_body_at_is_an_array_of_objects_and_it_does_not_have_property(String path, String property) throws Throwable {
        JSONArray array = JsonPath.read(getResponseData().responseBody, path);

        for (int i = 0; i < array.size(); i++) {
            Map<String, Object> jsonObject = (Map<String, Object>) array.get(i);
            assertEquals(false, jsonObject.toString().contains(property));
        }
    }

    @Then("^The response body looks like$")
    public void the_response_body_looks_like(DataTable dataTable) throws Throwable {
        JSONParser parser = new JSONParser(JSONParser.MODE_RFC4627);
        JSONObject jsonResponseBody = (JSONObject) parser.parse(getResponseData().responseBody);
        List<Map<String, String>> maps = dataTable.asMaps(String.class, String.class);

        Map<String, String> allKeys = maps.get(0);
        for (String key : allKeys.keySet()) {
            String value = allKeys.get(key);
            Assert.assertEquals(value, jsonResponseBody.getAsString(key));
        }
    }

    @And("^response headers contain$")
    public void responseHeadersContain(DataTable dataTable) throws Throwable {

        List<Map<String, String>> maps = dataTable.asMaps(String.class, String.class);
        for (int i = 0; i < maps.size(); i++) {
            Map<String, String> row = maps.get(i);
            final List<String> expectedValues = StreamSupport.stream(Splitter.on(',').split(row.get("value")).spliterator(), false)
                    .filter(v -> !Strings.isNullOrEmpty(v.trim()))
                    .map(v -> v.trim()).collect(Collectors.toList());
            assertEquals(String.format("Header [%s] mismatch", row.get("name")), expectedValues, getResponseData().getHeader(row.get("name")).orElse(Collections.emptyList()));
        }
    }
}
