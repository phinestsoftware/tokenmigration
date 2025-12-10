package com.rogers.cce.creditoption.constants;

public class StringConstants {
    public static final String OPERATOIN_NAME = "GetCreditOptions";
    public static final String SERVICE_NAME = "CCE-MS-CreditOptions";
    public static final String GET_CREDIT_OPTIONS_LOG ="CCE-Microservice-GetCreditOptions:";

    public static final String GLOBAL_PARAM = "GLOBAL_PARAM";
    public static final String MAX_DP_PERCENT = "MAX_DP_PERCENT";
    public static final String TIERED_INCREMENT = "TIERED_INCREMENT";
    public static final String DEFAULT_TAX = "DEFAULT_TAX";


    public static final String COMMA = ",";
    public static final String SPACE = " ";
    public static final String HIPHEN = "-";
    public static final String DATE_FORMAT="yyyy-MM-dd";


    // error message
    public static final String ERROR_CODE_000="000";
    public static final String ERROR_CODE_004="004";
    public static final String ERROR_CODE_005="005";
    public static final String ERROR_CODE_009="009";
    public static final String ERROR_CODE_012="012";
    public static final String ERROR_CODE_013="013";
    public static final String ERROR_CODE_014="014";
    public static final String ERROR_CODE_017="017";
    public static final String ERROR_MSG_005="Invalid AccountNumber ";
    public static final String ERROR_MSG_009="Invalid ApplicationID ";
    public static final String ERROR_MSG_017="Other error ";
    public static final String ERROR_MSG_012="Input RiskClass doesn't exist in the reference table";
    public static final String ERROR_MSG_004="Not able to find the credit option in credit reference";
    public static final String ERROR_MSG_017_DECRYPTION ="Decryption of AccountAlias failed";
    public static final String ERROR_MSG_017_DB ="Error while retrieving data from Cosmos DB";
    public static final String ERROR_MSG_013 = "Missing mandatory input fields : ";
    public static final String ERR_MSG_014 = "Input value is not valid: ";

}
