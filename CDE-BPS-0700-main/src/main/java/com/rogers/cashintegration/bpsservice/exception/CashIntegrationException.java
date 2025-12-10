package com.rogers.cashintegration.bpsservice.exception;


import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;

import jakarta.xml.bind.annotation.XmlElement;
import lombok.Getter;

/**
 * Custom exception class for handling Cash Integration errors.
 * Extends RuntimeException for unchecked exception handling.
 * <p>
 *
 * Created by Bhagyashri.Paramane on 2024-02-14
 * @author: Bhagyashri.Paramane
 * @date: 024-02-14
 * @project: bps-service
 */
 

@Getter
public class CashIntegrationException extends RuntimeException {

    private final SimpleDateFormat dateFormatter = new SimpleDateFormat("yyyy-MM-dd_HHmmss.SSS-zzz");
    private final String lineSeparator = System.lineSeparator();

    @XmlElement(name = "CashIntegrationErrorCode")
    private final CashIntegrationErrorCode errorCode;
    @XmlElement(name = "errorDetails")
    private final String errorDetails;
    private final Throwable ex;
    @XmlElement(name = "systemTimeInMilliSec")
    private final long systemTimeInMilliSec;

    public CashIntegrationException(CashIntegrationErrorCode errorCode) {
        super();
        this.errorCode = errorCode;
        this.errorDetails = null;
        this.ex = null;
        this.systemTimeInMilliSec = System.currentTimeMillis();
    }

    public CashIntegrationException(CashIntegrationErrorCode errorCode, Throwable ex) {
        super();
        this.errorCode = errorCode;
        this.errorDetails = null;
        this.ex = ex;
        this.systemTimeInMilliSec = System.currentTimeMillis();
    }

    public CashIntegrationException(CashIntegrationErrorCode errorCode, String errorDetails) {
        super();
        this.errorCode = errorCode;
        this.errorDetails = errorDetails;
        this.ex = null;
        this.systemTimeInMilliSec = System.currentTimeMillis();
    }

    public CashIntegrationException(CashIntegrationErrorCode errorCode, String errorDetails, Throwable ex) {
        super();
        this.errorCode = errorCode;
        this.errorDetails = errorDetails;
        this.ex = ex;
        this.systemTimeInMilliSec = System.currentTimeMillis();
    }


    @Override
    public String toString() {
        return exceptionDetails();
    }

    /**
     * Retrieves exception root cause
     *
     * @return A cause messages.
     */
    public String getRootCause() {
        return getExceptionMessagesRecursively();
    }

    public String getErrorDesc() {
        if (StringUtils.isNotBlank(errorDetails)) {
            return errorCode.getDescription() + "|" + errorDetails;
        } else {
            return errorCode.getDescription();
        }
    }


    /**
     * Generates a string with detailed information about the exception.
     *
     * @return A string containing exception details.
     */
    public String exceptionDetails() {
        StringBuilder sb = new StringBuilder();
        sb.append(lineSeparator);
        sb.append("====================================").append(lineSeparator);
        sb.append("===== CashIntegrationException =====").append(lineSeparator);
        sb.append("====================================").append(lineSeparator).append(lineSeparator);
        sb.append("Time: ").append(dateFormatter.format(new Date(systemTimeInMilliSec))).append(lineSeparator).append(lineSeparator);
        sb.append(errorCode.toString()).append(lineSeparator);
        if (errorDetails != null) {
            sb.append("AdditionalInfo: ").append(errorDetails).append(lineSeparator);
            sb.append(lineSeparator);
        }
        sb.append("Cause: ").append(getExceptionMessagesRecursively()).append(lineSeparator);

        if (ex != null) {
            sb.append(lineSeparator);
            sb.append("Stack trace: ").append(ExceptionUtils.getStackTrace(ex)).append(lineSeparator);
        }

        sb.append(lineSeparator);
        return sb.toString();
    }


    /**
     * Retrieves exception messages recursively from the cause.
     *
     * @return A list of exception messages.
     */
    private String getExceptionMessagesRecursively() {
        List<String> exMsgList = new ArrayList<>();
        for (Throwable tr : ExceptionUtils.getThrowableList(ex)) {
            if (!exMsgList.contains(tr.getMessage())) {
                exMsgList.add(tr.getMessage());
            }
        }
        return exMsgList.toString();
    }


}
