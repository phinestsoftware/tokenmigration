package com.rogers.cashintegration.bpsservice.integration.config;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.task.TaskDecorator;

import com.rogers.cashintegration.bpsservice.controller.BpsController;

import lombok.extern.log4j.Log4j2;
@Log4j2
public class MdcTaskDecorator implements TaskDecorator {
	private static final Logger logger = LoggerFactory.getLogger(MdcTaskDecorator.class);
    @Override
    public Runnable decorate(Runnable runnable) {
        // Right now: Web thread context !
        // (Grab the current thread MDC data)
        Map<String, String> contextMap = MDC.getCopyOfContextMap();
        return () -> {
            try {
                // Right now: @Async thread context !
                // (Restore the Web thread context's MDC data)
                MDC.setContextMap(contextMap);
                runnable.run();
            } catch (Throwable e) {
            	logger.error("Error in async task", e);
            } finally {
                MDC.clear();
            }
        };
    }
}