package com.rogers.cce.creditoption.controllers;

import com.rogers.cce.creditoption.config.BuildConfig;
import com.rogers.cce.creditoption.models.HealthCheckResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.info.BuildProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

@RestController
public class HealthCheckController {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.SHORT).withLocale(Locale.CANADA).withZone(ZoneId.of("America/New_York"));

    @Autowired
    private BuildProperties buildProperties;

    @Autowired
    private BuildConfig buildConfig;

    @GetMapping(value = "/status")
    public HealthCheckResponse status() {
        try {
            RuntimeMXBean runtimeMXBean = ManagementFactory.getRuntimeMXBean();
            Instant instant = Instant.ofEpochMilli(runtimeMXBean.getStartTime());
            LocalDateTime startTime = instant.atZone(ZoneId.systemDefault()).toLocalDateTime();
            return HealthCheckResponse.builder()
                    .service(buildProperties.getArtifact())
                    .artifactBuildVersion(buildProperties.getName())
                    .buildTime(formatter.format(buildProperties.getTime()))
                    .alivePeriod(calculateAliveTimePeriod(startTime))
                    .applicationStartTime(formatter.format(instant))
                    .buildNumber(buildConfig.getBuildNumber())
                    .build();
        } catch (Exception e) {
            return HealthCheckResponse.builder()
                    .service(buildProperties.getArtifact())
                    .artifactBuildVersion(buildProperties.getName())
                    .buildTime(formatter.format(buildProperties.getTime()))
                    .alivePeriod("UNKNOWN")
                    .applicationStartTime("UNKNOWN")
                    .buildNumber(buildConfig.getBuildNumber())
                    .build();
        }
    }

    private String calculateAliveTimePeriod(LocalDateTime startTime) {
        LocalDateTime currentTime = LocalDateTime.now();
        LocalDateTime startTimeTemp = LocalDateTime.from(startTime);
        long days = startTimeTemp.until(currentTime, ChronoUnit.DAYS);
        startTimeTemp = startTimeTemp.plusDays(days);
        long hours = startTimeTemp.until(currentTime, ChronoUnit.HOURS);
        startTimeTemp = startTimeTemp.plusHours(hours);
        long minutes = startTimeTemp.until(currentTime, ChronoUnit.MINUTES);
        List<String> concatString = List.of(String.valueOf(days), String.valueOf(hours), String.valueOf(minutes), "(D.H.M)");
        return String.join(".", concatString);
    }
}
