package com.semafone.tndispatcher.services.rest.steps;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Strings;
import com.google.common.base.Throwables;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.jayway.jsonpath.JsonPath;
import com.semafone.tndispatcher.DispatcherSupport;
import com.semafone.tndispatcher.TestApplication;
import com.semafone.tndispatcher.constants.Constants;
import com.semafone.tndispatcher.services.rest.HeaderSettingRequestCallback;
import com.semafone.tndispatcher.services.rest.ResponseResults;
import cucumber.api.DataTable;
import jakarta.annotation.PostConstruct;
import javafx.util.Pair;
import lombok.AccessLevel;
import lombok.Getter;
import net.logstash.logback.encoder.org.apache.commons.lang.StringUtils;
import org.apache.commons.codec.binary.Base64;
import org.junit.runner.RunWith;
import org.skyscreamer.jsonassert.JSONAssert;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.*;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.util.*;

import static com.semafone.tndispatcher.services.rest.steps.AbstractCucumberTest.ResponseData.ResponseDataBuilder;
import static com.semafone.tndispatcher.services.rest.steps.AbstractCucumberTest.ResponseData.ResponseDataBuilder.fromData;
import static java.util.Optional.empty;
import static java.util.Optional.ofNullable;
import static org.junit.Assert.assertEquals;

@RunWith(SpringRunner.class)
@ContextConfiguration(classes = TestApplication.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class AbstractCucumberTest {
    private static final Set<String> REPLACEABLE_PROPERTIES = ImmutableSet.of("href", "port");

    public static final String LOCALHOST = "localhost";
    @Value("${local.server.port}")
    protected int port;
    @Value("${security.user.name}")
    private static String authUserName;
    @Value("${security.user.password}")
    private static String authPassword;

    @Autowired
    @Getter(AccessLevel.PROTECTED)
    protected DispatcherSupport dispatcherSupport;


    //return restTemplate();
    private ThreadLocal<RestTemplate> restTemplate = ThreadLocal.withInitial(RestTemplate::new);

    private static ThreadLocal<ResponseData> responseData = ThreadLocal.withInitial(() -> new ResponseDataBuilder().buildAndStore());

    //this is for settin proxy for zap scan.
    private RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        Proxy proxy = new Proxy(java.net.Proxy.Type.HTTP, new InetSocketAddress("127.0.0.1", 8080));
        requestFactory.setProxy(proxy);
        return new RestTemplate(requestFactory);
    }

    @Autowired
    protected ObjectMapper objectMapper;

    @PostConstruct
    protected void init() {
    }

    protected void clearResponseData() {
        responseData.remove();
        restTemplate.remove();
    }

    protected UriComponentsBuilder uriBuilder(String domain) {
        String baseUrl = "http://" + domain + Constants.DISPATCH_CONTROLLER_API + Constants.DISPATCH_CONTROLLER_DISPATCH;
        return UriComponentsBuilder.fromHttpUrl(baseUrl).port(port);
    }

    protected ResponseData getResponseData() {
        return responseData.get();
    }

    protected void executeGet(String domain, String path) throws Exception {
        executeHttpMethod(domain, path, HttpMethod.GET, Collections.EMPTY_MAP);
    }

    protected void executeGetWithHeaders(String path, Map<String, List<String>> extraHeaders) throws Exception {
        executeHttpMethod(LOCALHOST, path, HttpMethod.GET, extraHeaders);
    }

    protected void executeDelete(String path) throws Exception {
        executeHttpMethod(LOCALHOST, path, HttpMethod.DELETE, Collections.EMPTY_MAP);
    }

    protected void executeHttpMethod(String domain, String path, HttpMethod httpMethod, Map<String, List<String>> extraHeaders) throws Exception {
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.add("Accept", "application/xml");
        httpHeaders.putAll(extraHeaders);

        final HeaderSettingRequestCallback requestCallback = new HeaderSettingRequestCallback(httpHeaders);
        final ResponseResultErrorHandler errorHandler = new ResponseResultErrorHandler();

        restTemplate.get().setErrorHandler(errorHandler);
        final String fullGetPath = uriBuilder(domain).path(path).build().toString();
        final ResponseResults latestResponse = restTemplate.get().execute(fullGetPath, httpMethod, requestCallback, response -> {
            if (errorHandler.hadError) {
                return (errorHandler.getResults());
            }
            return (new ResponseResults(response));
        });
        ResponseDataBuilder.fromData(responseData.get())
                           .withStatusCode((HttpStatus) latestResponse.getTheResponse().getStatusCode())
                           .withResponseBody(latestResponse.getBody())
                           .withBasePath(uriBuilder(domain).build().toString()).buildAndStore();
        System.out.printf("<-----------   RESPONSE [%s]-[%s]    --------------\n------------   HTTP STATUS [%s]\n------------   BODY [%s]\n", httpMethod.name(), fullGetPath, responseData.get().statusCode, responseData.get().responseBody);
    }

    protected void executePost(String path, String json) throws IOException {
        executeRequest(HttpMethod.POST, path, json, Collections.EMPTY_MAP);
    }


    protected void executePostWithHeaders(String path, String json, Map<String, List<String>> headers) throws IOException {
        executeRequest(HttpMethod.POST, path, json, headers);
    }

    protected void executePut(String path, String json) throws IOException {
        executeRequest(HttpMethod.PUT, path, json, Collections.EMPTY_MAP);
    }

    protected void executeRequest(HttpMethod method, String path, String json, Map<String, List<String>> headers) throws IOException {
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.add("Accept", "application/xml");
        httpHeaders.add("Content-Type", "application/xml;charset=UTF-8");
        httpHeaders.putAll(headers);
        responseData.get().addAuthHeader(httpHeaders);

        final ResponseResultErrorHandler errorHandler = new ResponseResultErrorHandler();
        restTemplate.get().setErrorHandler(errorHandler);
        HttpEntity<String> entity = new HttpEntity<>(json == null ? "{}" : json, httpHeaders);

        final String url = uriBuilder(LOCALHOST).path(path).build().toString();
        System.out.printf("----------->   REQUEST  [%s]-[%s]    --------------\n------------   BODY [%s]\n", method.name(), url, json);
        System.out.println(objectMapper.writeValueAsString(httpHeaders));
        ResponseEntity<String> response = restTemplate.get().exchange(url, method, entity, String.class);
        final HttpStatus postStatus = (HttpStatus) response.getStatusCode();
        ResponseDataBuilder.fromData(responseData.get()).withStatusCode(postStatus)
                           .withResponseBody(postStatus.value() < 400 ? response.getBody() : errorHandler.getResults().getBody())
                           .withBasePath(uriBuilder(LOCALHOST).build().toString())
                           .withResponseHeaders(response.getHeaders())
                           .buildAndStore();
        System.out.printf("<-----------   RESPONSE [%s]-[%s]    --------------\n------------   HTTP STATUS [%s]\n------------   BODY [%s]\n", method.name(), url, responseData.get().statusCode, responseData.get().responseBody);
    }

    protected void executePut(String url, String entityJson, Object urlVariables) throws Exception {

        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.add("Accept", "application/json");
        httpHeaders.add("Content-Type", "application/json;charset=UTF-8");
        httpHeaders.setContentType(MediaType.APPLICATION_JSON);

        final ResponseResultErrorHandler errorHandler = new ResponseResultErrorHandler();
        restTemplate.get().setErrorHandler(errorHandler);

        HttpEntity<String> httpEntity = new HttpEntity<>(entityJson, httpHeaders);
        ResponseEntity<String> response = restTemplate.get().exchange(url, HttpMethod.PUT, httpEntity, String.class, urlVariables);
        new ResponseDataBuilder().withStatusCode((HttpStatus) response.getStatusCode()).withResponseBody(response.getBody()).withBasePath(uriBuilder(LOCALHOST).build().toString()).buildAndStore();
        System.out.printf("------------   RESPONSE [%s]-[%s]    --------------\n------------   HTTP STATUS [%s]\n------------   BODY [%s]\n", "PUT", url, responseData.get().statusCode, responseData.get().responseBody);
    }

    public void assertJsonPathEqualsStringValue(String jsonPath, String expected) throws Exception {
        String actual = objectMapper.writeValueAsString(JsonPath.read(responseData.get().responseBody, jsonPath));
        assertEquals(expected, actual);
    }

    public void assertJsonPathEqualsJsonString(String jsonPath, String expected) throws Exception {
        String actual = objectMapper.writeValueAsString(JsonPath.read(responseData.get().responseBody, jsonPath));
        JSONAssert.assertEquals(expected, actual, false);
    }

    protected static String getPart(String path, String identifier, int targetOffset) {
        String[] split = path.split("/");
        for (int i = 0; i < split.length; i++) {
            if (identifier.equals(split[i])) {
                if (split.length > i + targetOffset) {
                    return split[i + targetOffset];
                } else {
                    return null;
                }
            }
        }
        return null;
    }

    protected String replaceInPath(String path, String placeholder, String replacement) {
        if (StringUtils.contains(path, placeholder)) {
            return StringUtils.replace(path, placeholder, replacement);
        }
        return path;
    }

    protected String replaceInPath(String path) {
        for (Pair<String, String> replacement : getResponseData().getReplacements()) {
            path = StringUtils.replace(path, replacement.getKey(), replacement.getValue());
        }
        return path;
    }

    public static class ResponseData {
        public static final String AUTHORIZATION_KEY = "Authorization";
        public static final String AUTH_TOKEN_KEY = "x-auth-token";
        final String responseBody;
        final String basePath;
        private final SortedMap<String, Pair<String, String>> replacements = com.google.common.collect.Maps.newTreeMap();
        final String sessionId;
        final HttpStatus statusCode;
        private HttpHeaders httpHeaders;

        public ResponseData(ResponseDataBuilder builder) {
            this.responseBody = builder.responseBody;
            this.basePath = builder.basePath;
            this.sessionId = builder.sessionId;
            this.statusCode = builder.statusCode;

            if (!Strings.isNullOrEmpty(basePath)) {
                put("<basepath>", StringUtils.removeEnd(basePath, "/"));
                put("<port>", StringUtils.split(StringUtils.removeEnd(basePath, "/api"), ":")[2]);
            }
            if (statusCode != null && statusCode.is4xxClientError()) {
                if (builder.replacements != null) {

                    builder.replacements.forEach((e, p) -> putIfAbsent(e, p.getValue()));
                }
            } else if (!Strings.isNullOrEmpty(responseBody)) {
            }
            if (builder.httpHeaders != null) {
                this.httpHeaders = builder.httpHeaders;
            }

            responseData.set(this);
        }

        public Pair<String, String> put(String key, String value) {
            return replacements.put(key, new Pair<>(key, value));
        }

        public Pair<String, String> putIfAbsent(String key, String value) {
            return replacements.putIfAbsent(key, new Pair<>(key, value));
        }

        public ResponseData withSessionId(ResponseEntity<String> postResponse) {
            final ResponseData data = new ResponseData(fromData(this).withSessionId(getSessionId(postResponse)));
            return data;
        }

        private String getSessionId(ResponseEntity<String> postResponse) {
            final List<String> strings = postResponse.getHeaders().get(AUTH_TOKEN_KEY);
            return (strings == null || strings.isEmpty()) ? null : strings.get(0);
        }

        public Optional<List<String>> getHeader(String key) {
            return this.httpHeaders == null
                    ? empty()
                    : ofNullable(httpHeaders.get(key));
        }

        public ResponseData withStatusCode(HttpStatus statusCode) {
            final ResponseData data = new ResponseData(fromData(this).withStatusCode(statusCode));
            return data;
        }

        public ResponseData withResponseBody(String responseBody) {
            final ResponseData data = new ResponseData(fromData(this).withResponseBody(responseBody));
            return data;
        }

        public ResponseData withBasePath(String basePath) {
            final ResponseData data = new ResponseData(fromData(this).withBasePath(basePath));
            return data;
        }

        public void addAuthHeader(HttpHeaders httpHeaders) {
            if (sessionId == null) {
                httpHeaders.add(AUTHORIZATION_KEY, Base64.encodeBase64String(String.format("%s:%s", authUserName, authPassword).getBytes()));
            } else {
                httpHeaders.add(AUTH_TOKEN_KEY, sessionId);
            }
        }

        public Iterable<Pair<String, String>> getReplacements() {
            return replacements.values();
        }

        public String getReplacement(String key) {
            return replacements.get(key).getValue();
        }

        public static class ResponseDataBuilder {
            private String responseBody;
            private String basePath;
            private SortedMap<String, Pair<String, String>> replacements = com.google.common.collect.Maps.newTreeMap();
            private String sessionId;
            private HttpStatus statusCode;
            private HttpHeaders httpHeaders;

            public static ResponseDataBuilder fromData(ResponseData data) {
                ResponseDataBuilder builder = new ResponseDataBuilder();
                builder.replacements = Maps.newTreeMap(data.replacements);
                builder.responseBody = data.responseBody;
                builder.sessionId = data.sessionId;
                builder.statusCode = data.statusCode;
                builder.basePath = data.basePath;
                builder.replacements = data.replacements;
                return builder;
            }

            public static ResponseDataBuilder fromResponseResults(ResponseResults responseResults) {
                ResponseDataBuilder builder = new ResponseDataBuilder();
                builder.responseBody = responseResults.getBody();
                try {
                    builder.statusCode = (HttpStatus) responseResults.getTheResponse().getStatusCode();
                    builder.withResponseHeaders(responseResults.getTheResponse().getHeaders());
                } catch (IOException e) {
                    throw Throwables.propagate(e);
                }

                return builder;
            }

            public ResponseDataBuilder withSessionId(String sessionId) {
                this.sessionId = sessionId;
                return this;
            }

            public ResponseDataBuilder withStatusCode(HttpStatus statusCode) {
                this.statusCode = statusCode;
                return this;
            }

            public ResponseDataBuilder withResponseBody(String responseBody) {
                this.responseBody = responseBody;
                return this;
            }

            public ResponseData buildAndStore() {
                return new ResponseData(this);
            }

            public ResponseDataBuilder withBasePath(String basePath) {
                this.basePath = basePath;
                return this;
            }

            public ResponseDataBuilder withResponseHeaders(HttpHeaders headers) {
                this.httpHeaders = headers;
                return this;
            }
        }
    }

    private class ResponseResultErrorHandler implements ResponseErrorHandler {
        private ResponseResults results = null;
        private Boolean hadError = false;

        private ResponseResults getResults() {
            return results;
        }

        @Override
        public boolean hasError(ClientHttpResponse response) throws IOException {
            int rawStatusCode = response.getStatusCode().value();//getRawStatusCode();
            hadError = rawStatusCode >= 400;
            System.out.printf("hasError, statusCode: %d, statusText: %s%n%n", rawStatusCode, response.getStatusText());
            return hadError;
        }

        @Override
        public void handleError(ClientHttpResponse response) throws IOException {
            response.getStatusText();
            results = new ResponseResults(response);
        }
    }

    protected List<Map<String, Object>> replacePlaceholders(DataTable expectedValues) {
        ArrayList<Map<String, Object>> expectedAsList = Lists.newArrayList(expectedValues.asMaps(String.class, Object.class));
        List<Map<String, Object>> result = Lists.newArrayList();

        expectedAsList.stream().forEach(m -> {
            Map<String, Object> resultMap = Maps.newHashMap();
            result.add(resultMap);
            for (Map.Entry<String, Object> e : m.entrySet()) {
                Object v = e.getValue();
                if (REPLACEABLE_PROPERTIES.contains(e.getKey())) {
                    for (Pair<String, String> replacement : responseData.get().replacements.values()) {
                        v = ((String) v).contains(replacement.getKey()) ? ((String) v).replace(replacement.getKey(), replacement.getValue()) : v;
                    }
                }
                resultMap.put(e.getKey(), v);
            }
        });
        return result;
    }

}