package com.semafone.tndispatcher.model;

import lombok.Getter;

import java.util.Map;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

public enum ResponseStatus {
    OK(100), BADTOKEN(101), INVALIDNUM(102), BADTYPE(103), TYPEMISMATCH(104), BADBIN(105), UNKWNERROR(106), NOACCESS(200), NOSERVICE(201),
    //parsing errors
    BADREQUEST_INVALIDOPERATION(501),
    ERROR_RESPONSECODE(601);
    private static final Map<Integer, ResponseStatus> codeToEnum;

    static {
        final Stream<ResponseStatus> stream = StreamSupport.stream(Spliterators.<ResponseStatus>spliterator(values(), Spliterator.DISTINCT), false);
        codeToEnum = stream.filter(e -> e.code < 500).collect(Collectors.toMap(e -> e.code, e -> e));
    }

    @Getter
    private final int code;

    ResponseStatus(int code) {
        this.code = code;
    }

    /**
     * returns Moneris responseCode or ERROR_RESPONSECODE if code not found
     *
     * @param code
     * @return
     */
    public static ResponseStatus fromCode(int code) {
        return codeToEnum.getOrDefault(code, ERROR_RESPONSECODE);
    }

    public boolean isBusinessError() {
        return code <= 201;
    }
}
