package com.rogers.cashintegration.bpsservice.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;


/*
 * Created by Bhagyashri.Paramane on 2024-02-14
 * @author: Bhagyashri.Paramane
 * @date: 024-02-14
 * @project: bps-service
 */
@Getter
@AllArgsConstructor
public enum CashIntegrationErrorCode {
	
	BATCH_PUT_MALFORMED_REQUEST(
			"2001010",
			"Malformed request, expected elements and/or attachment missing or invalid values used",
			"Please ensure the request is valid"),
			
	BATCH_PUT_AMEX_PGP_ERROR(
			"6005010",
			"An error has occurred while performing PGP cryptography on the payload",
			"Please check the log for more detailed information"),
			
	BATCH_GET_TOKENISATION_ERROR(
			"1002021",
			"Tokenisation errors thrown for one or more of the records in the batch file downloaded.",
			"Please check the log for more detailed information"),
			
	CPT_BATCH_SFTP_ERROR_UPLOAD(
			"2003010",
			"Secure File Transfer errors thrown when uploading a processed batch file to Paymentech",
			"Please try again ensuring the batch file to be submitted is correct and connectivity to Paymentech SFTP site can be established"),
	
	AMEX_BATCH_SFTP_ERROR_UPLOAD(
			"6003010",
			"Secure File Transfer errors thrown when uploading a processed batch file to Amex",
			"Please try again ensuring the batch file to be submitted is correct and connectivity to Amex SFTP site can be established"),
	
	CDE_INTERNAL_ERROR(
			"1004010",
			"Internal CDE error;",
			"Please contact your CDE administrator"),
	TOKEN_INFER_ERROR(
			"1001010",
			"Unable to infer a vault vendor token from the request.",
			"Please check if the request is well formed with a valid vault vendor token"),
	CS_RETURNED_ERROR(
			"1002011",
			"Error response returned from vault vendor",
			"Please ensure 1) a valid Token or PAN is used in the request, 2) a valid vault vendor user credential is used");
	
    private final String code;
    private final String description;
    private final String remedy;

    @Override
    public String toString() {
        String lineSeparator = System.lineSeparator();
        return lineSeparator + "ErrorCode=> " + getCode() + lineSeparator +
                "Description=> " + getDescription() + lineSeparator +
                "Remedy=> " + getRemedy() + lineSeparator +
                lineSeparator;
    }

}
