package com.rogers.cashintegration.bpsservice.exception;

public class ErrorAlertConstants {
	private ErrorAlertConstants() {
	    throw new IllegalStateException("ErrorAlertConstants class");
	  }
	
public static final String BATCH_PROCESS_ERROR_FILENAME_PREFIX ="BatchProcessingError_";
public static final String BATCH_PUT_ERR_ALERT_STR="|Batch Put|Exception thrown when processing the submitted batch file|";

//BATCH GET
public static final String BATCH_GET_ERR_ALERT_STR="|Batch Get|Exception thrown when attempting to return a batch result file|";

//BATCH CPT OUTBOUND
public static final String BATCH_CPT_OUT_DETOK_RETRY_ERR_ALERT_STR="|Paymentech Batch|Batch processing on a file destined to Paymentech failed|vault provider de-tokenisation failure__Retrying__|";
public static final String BATCH_CPT_OUT_DETOK_ERR_ALERT_STR="|Paymentech Batch|Batch processing on a file destined to Paymentech failed|vault provider de-tokenisation failed_|";
public static final String BATCH_CPT_OUT_ERR_ALERT_STR="|Paymentech Batch|Batch processing on a file destined to Paymentech failed|";

//BATCH CPT INBOUND
public static final String BATCH_CPT_IN_DOWNLOAD_ERR_ALERT_STR="|Paymentech Batch|Failure detected when attempting to download available files from Paymentech|";
public static final String BATCH_CPT_IN_ERR_ALERT_STR="|Paymentech Batch|Batch processing on a file downloaded from Paymentech failed|";
public static final String BATCH_CPT_IN_REG_ERR_ALERT_STR="|Paymentech Batch|Batch processing on a TSC/MACC/Settlement file downloaded from Paymentech failed|";
public static final String BATCH_CPT_IN_ACCUP_ERR_ALERT_STR="|Paymentech Batch|Batch processing on an Account updater file downloaded from Paymentech failed|";
public static final String BATCH_CPT_IN_TOK_RETRY_ERR_ALERT_STR="|Paymentech Batch|Batch processing on an Account updater file downloaded from Paymentech failed|vault provider tokenisation failure__Retrying__|";
public static final String BATCH_CPT_IN_TOK_ERR_ALERT_STR="|Paymentech Batch|Batch processing on an Account updater file downloaded from Paymentech failed|vault provider tokenisation failed_|";

//AMEX OUTBOUND
public static final String BATCH_AMEX_OUT_DETOK_RETRY_ERR_ALERT_STR="|Amex Batch|Batch processing on a INT-27 file destined to Amex failed|vault provider de-tokenisation failure__Retrying__|";
public static final String BATCH_AMEX_OUT_DETOK_ERR_ALERT_STR="|Amex Batch|Batch processing on a INT-27 file destined to Amex failed|vault provider de-tokenisation failed_|";
public static final String BATCH_AMEX_OUT_ERR_ALERT_STR="|Amex Batch|Batch processing on a INT-27 file destined to Amex failed|";

//AMEX INBOUND
//INT-26
public static final String BATCH_AMEX_IN_INT26_DOWNLOAD_ERR_ALERT_STR="|Amex Batch|Failure detected when attempting to download available INT-26 files from Amex|";
public static final String BATCH_AMEX_IN_INT26_TOK_RETRY_ERR_ALERT_STR="|Amex Batch|Batch processing on a INT-26 file downloaded from Amex failed|vault provider tokenisation failure__Retrying__|";
public static final String BATCH_AMEX_IN_INT26_TOK_ERR_ALERT_STR="|Amex Batch|Batch processing on a INT-26 file downloaded from Amex failed|vault provider tokenisation failed_|";
public static final String BATCH_AMEX_IN_INT26_ERR_ALERT_STR="|Amex Batch|Batch processing on a INT-26 file downloaded from Amex failed|";

//INT-35
public static final String BATCH_AMEX_IN_INT35_DOWNLOAD_ERR_ALERT_STR="|Amex Batch|Failure detected when attempting to download available INT-35 files from Amex|";
public static final String BATCH_AMEX_IN_INT35_TOK_RETRY_ERR_ALERT_STR="|Amex Batch|Batch processing on a INT-35 file downloaded from Amex failed|vault provider tokenisation failure__Retrying__|";
public static final String BATCH_AMEX_IN_INT35_TOK_ERR_ALERT_STR="|Amex Batch|Batch processing on a INT-35 file downloaded from Amex failed|vault provider tokenisation failed_|";
public static final String BATCH_AMEX_IN_INT35_ERR_ALERT_STR="|Amex Batch|Batch processing on a INT-35 file downloaded from Amex failed|";

//INTERNAL BATCH FILE
public static final String BATCH_ERR_FILE_INTERNAL_SAVE_ALERT_STR="|CIP Internal|Exception thrown when attempting to save an error file that was generated due to batch process failure(s) at the Cash Integration Platform|";
public static final String FAILURE_AROSE_WHEN_UPLOADING ="Failure arose when uploading ";
}
