package com.semafone.tndispatcher.constants;

public class Constants {
    public static final String DISPATCH_CONTROLLER_API = "/api";
    public static final String DISPATCH_CONTROLLER_DISPATCH = "/dispatch";
    public static final String MASK_CHARACTER = "*";
    public static final String ACCOUNT_NUMBER_MASK_PATTERN = "<accountNumber>(.*?)</accountNumber>";
    public static final String CREDIT_CARD_NUMBER_MASK_PATTERN = "<creditCardNumber>(.*?)</creditCardNumber>";
    public static final String MISSING = " is missing";
    private Constants() {
    }
}
