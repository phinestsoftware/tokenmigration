package com.rogers.cashintegration.bpsservice.util;

public class BpsConstants {
	private BpsConstants() {
	    throw new IllegalStateException("BpsConstants class");
	  }
	
	public static final String FILE_FORMAT_TXT="TXT";
	public static final String FILE_FORMAT_ZIP="ZIP";
    
	public static final String SUCCESS="SUCCESS";
	public static final String FAIL="FAIL";
	
	public static final String LINE_SEPARATOR = "\n";
	public static final String PAYMENT_STRING_PREFIX = "S";
	public static final int CPT_TOKEN_END_INDEX = 56;
	public static final int CPT_TOKEN_START_INDEX = 38;
	public static final char PADDING_CHAR = ' ';
	public static final int PAYMENT_RECORD_LENGTH = 81;
	
	public static final int AMEX_TOKEN_END_INDEX = 62;
	public static final int AMEX_TOKEN_START_INDEX = 47;
	
	public static final String AMEX_LINE_SEPARATOR = "\r\n";
	public static final String PAYMENTECH_FILE_T_PREFIX = "t";
	public static final String PAYMENTECH_FILE_P_PREFIX = "p";
	public static final String BATCH_MESSAGE_ATTACHMENT_PARAMETER_KEY="attachment";
	public static final String BATCH_MESSAGE_PAYLOAD_PARAMETER_KEY="payload";
	public static final String FILE_NAME="file_name";
	public static final String FILE_TYPE="filetype";
	public static final String REQUEST_ID="requestId";
	public static final String PAYLOAD = "payload";
}
