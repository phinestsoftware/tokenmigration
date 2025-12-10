package com.semafone.tndispatcher.http;

import com.google.common.base.Charsets;
import com.google.common.base.Throwables;
import com.google.common.io.ByteSource;
import com.google.common.io.ByteStreams;
import lombok.Getter;
import org.springframework.http.HttpMethod;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

import static com.google.common.base.Preconditions.checkNotNull;

@Getter
public class RequestContext {

    private final Map<String, String> requestParameters;
    private final InputStream requestInputStream;
    private String requestString;

    private String requestPath;

    private final HttpMethod httpMethod;

    private String responseBody;

    public RequestContext(InputStream requestInputStream,
                          HttpMethod httpMethod, String requestPath,
                          Map<String, String> requestParameters) {

        this.httpMethod = httpMethod;
        this.requestInputStream = requestInputStream;
        this.requestParameters = requestParameters;
        this.requestPath = requestPath;
    }

    public boolean isHttpPost() {
        return httpMethod == HttpMethod.POST;
    }

    public String getResponseBody() {
        return checkNotNull(responseBody);
    }

    public void setResponseBody(String responseBody) {
        this.responseBody = responseBody;
    }

    public InputStream getRequestInputStream() {
        return new ByteArrayInputStream(getRequestBodyAsString().getBytes());
    }

    public String getRequestBodyAsString() {
        if (requestString == null) {
            try {
                this.requestString = ByteSource.wrap(ByteStreams.toByteArray(this.requestInputStream))
                                               .asCharSource(Charsets.UTF_8).read();
            } catch (IOException e) {
                throw Throwables.propagate(e);
            }
        }
        return requestString;
    }
}
