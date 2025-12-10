package com.semafone.tndispatcher.utils;

import ch.qos.logback.classic.PatternLayout;
import ch.qos.logback.classic.spi.ILoggingEvent;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

import static com.semafone.tndispatcher.constants.Constants.ACCOUNT_NUMBER_MASK_PATTERN;
import static com.semafone.tndispatcher.constants.Constants.CREDIT_CARD_NUMBER_MASK_PATTERN;

@Slf4j
public class MaskingPatternLayout extends PatternLayout {

    private final List<String> maskPatterns = new ArrayList<>();
    private Pattern multilinePattern;

    // invoked for every config entry.
    public void addMaskPattern(String maskPattern) {

        if (!maskPatterns.contains(ACCOUNT_NUMBER_MASK_PATTERN))
            maskPatterns.add(ACCOUNT_NUMBER_MASK_PATTERN);
        if (!maskPatterns.contains(CREDIT_CARD_NUMBER_MASK_PATTERN))
            maskPatterns.add(CREDIT_CARD_NUMBER_MASK_PATTERN);

        maskPatterns.add(maskPattern);
        multilinePattern = Pattern.compile(String.join("|", maskPatterns), Pattern.MULTILINE);
    }

    @Override
    public String doLayout(ILoggingEvent event) {
        return maskMessage(super.doLayout(event));
    }

    private String maskMessage(String message) {
        if (multilinePattern == null) {
            return message;
        }
        StringBuilder sb = new StringBuilder(message);
        Matcher matcher = multilinePattern.matcher(sb);
        while (matcher.find()) {
            IntStream.rangeClosed(1, matcher.groupCount()).forEach(group -> {
                if (matcher.group(group) != null) {
                    String clear = matcher.group(group);
                    String maskedString = null;

                    try {
                        maskedString = clear.length() <= 3 // for CVC
                                ? StringUtils.maskString(matcher.group(group), CharBufferFormatStyle.CLEAR)
                                : StringUtils.maskString(matcher.group(group), CharBufferFormatStyle.FIRST_6_LAST_4);
                    } catch (Exception e) {
                       log.error("Error occurred while masking!");
                    }


                    sb.replace(matcher.start(group), matcher.end(group), maskedString);
                }
            });
        }
        return sb.toString();
    }

}