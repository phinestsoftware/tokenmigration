package com.rogers.cashintegration.bpsservice.exception;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;

import org.apache.commons.io.FileUtils;

/**
 *
 * Created by Shankar.Chakraborty on 2024-02-09 - 12:44 p.m.
 *
 * @author: Shankar.Chakraborty
 * @date: 2023-12-01
 * @project: tsi-service
 **/

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

/**
 * Component responsible for processing and generating error alert notifications.
 */
@Component
public class ErrorAlertNotificationProcessor {

    private static final Logger errorLogger = LogManager.getLogger("CIP_ALERT");
    /**
     * Generates an error alert message from the provided exception.
     *
     * @param exception The exception from which the error alert message is generated.
     *
     */
    public void generateErrorAlert(Exception exception,String errorAlertPrefix) {
        CashIntegrationException ex = (CashIntegrationException) exception;
        String message =  errorAlertPrefix +
                "Cause=> " + processException(ex) + "|" +
                "CashIntegrationException=> " +
                "ErrorCode= " + ex.getErrorCode().getCode() + "," +
                "Desc= " + ex.getErrorCode().getDescription() +
                "|";
        errorLogger.error(message);
    }

    public void generateErrorFile(Exception exception,String fileStorePrefix, String fileName) {
        CashIntegrationException ex = (CashIntegrationException) exception;
        StringBuilder errorFileName = new StringBuilder();
        errorLogger.info("BPS|batch_async_common|capture_batch_processing_failure|Batch Processing Failure.");
		if(StringUtils.isNotEmpty(fileStorePrefix) && StringUtils.isNotEmpty(fileName)) {
			errorFileName.append(fileStorePrefix);
			errorFileName.append(fileName);
		}else {
			errorFileName.append(ErrorAlertConstants.BATCH_PROCESS_ERROR_FILENAME_PREFIX);
			errorFileName.append(MDC.get("requestId"));
		}
		try {
			File errorFile = Paths.get("/pkg/cde_store/"+errorFileName.toString()+".err").toFile();
			FileUtils.writeByteArrayToFile(errorFile, ex.toString().getBytes());
		} catch (IOException e) {
			errorLogger.error(ErrorAlertConstants.BATCH_ERR_FILE_INTERNAL_SAVE_ALERT_STR);
		}
		errorLogger.info("BPS|batch_async_common|capture_batch_processing_failure|Error file {} is saved to the CDE store.", errorFileName);

		errorLogger.info("BPS|batch_async_common|capture_batch_processing_failure|EXIT");
    }
    
    /**
     * Processes the provided CashIntegrationException and returns a formatted message.
     *
     * @param ex CashIntegrationException to be processed.
     * @return Formatted message from the exception.
     */
    private String processException(CashIntegrationException ex) {
        String message = ExceptionUtils.getRootCauseMessage(ex);
        if (StringUtils.isBlank(message)) {
            message = ex.getMessage();
        }
        return message + ex.getRootCause();
    }
}
