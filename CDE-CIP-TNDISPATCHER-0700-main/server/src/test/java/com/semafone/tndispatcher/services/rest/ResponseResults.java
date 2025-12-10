package com.semafone.tndispatcher.services.rest;

import com.google.common.base.Charsets;
import com.google.common.io.ByteSource;
import com.google.common.io.ByteStreams;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;
import java.io.InputStream;

public class ResponseResults {
    private final ClientHttpResponse theResponse;
    private final String body;
    private final String basePath;

    public ResponseResults(final ClientHttpResponse response) throws IOException {
        this.theResponse = response;
        if (response.getStatusCode().equals(HttpStatus.NOT_FOUND)) {
            this.body = "{}";
        } else {
            final InputStream bodyInputStream = response.getBody();
            if (null == bodyInputStream) {
                this.body = "{}";
            } else {

                this.body = ByteSource.wrap(ByteStreams.toByteArray(bodyInputStream))
                        .asCharSource(Charsets.UTF_8).read();
            }
        }

        basePath = response.getStatusText();

    }

    public ClientHttpResponse getTheResponse() {
        return theResponse;
    }

    public String getBody() {
        return body;
    }


}