package com.semafone.tndispatcher.http;

import com.google.common.base.Throwables;
import com.google.common.collect.Maps;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpMethod;
import org.springframework.util.ObjectUtils;

import java.io.IOException;
import java.util.Map;

public class RequestResolver {
    private RequestResolver() {
    }
    
    public static RequestContext resolve(HttpServletRequest request) {

        try {
            Map<String, String> requestParameters = Maps.newTreeMap();
            requestParameters.putAll(Maps.transformEntries(request.getParameterMap(), (key, value) -> ObjectUtils.isEmpty(value) ? null : value[0]));
            return new RequestContext(request.getInputStream(),
                    HttpMethod.valueOf(request.getMethod()),
                    request.getServletPath(),
                    requestParameters);
        } catch (IOException e) {
            throw Throwables.propagate(e);
        }
    }
}
