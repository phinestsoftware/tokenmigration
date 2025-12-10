package com.semafone.tndispatcher.service;

import com.semafone.tndispatcher.http.RequestContext;
import com.semafone.tndispatcher.http.service.HttpService;
import lombok.AccessLevel;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;

public abstract class TnRequestDispatcher {

    @Getter(AccessLevel.PROTECTED)
    private final HttpService httpService;

    @Autowired
    public TnRequestDispatcher(
            HttpService httpService
    ) {
        this.httpService = httpService;
    }

    public abstract void dispatch(RequestContext context);
}
