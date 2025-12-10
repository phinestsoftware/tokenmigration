package com.rogers.cashintegration.bpsservice.service.impl;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.web.client.RestTemplate;

import com.rogers.cashintegration.bpsservice.exception.CashIntegrationErrorCode;
import com.rogers.cashintegration.bpsservice.exception.CashIntegrationException;
import com.rogers.cashintegration.bpsservice.exception.ErrorAlertConstants;
import com.rogers.cashintegration.bpsservice.exception.ErrorAlertNotificationProcessor;
import com.rogers.cashintegration.bpsservice.dto.CSProcessRequest;
import com.rogers.cashintegration.bpsservice.dto.CSProcessResponse;
import com.rogers.cashintegration.bpsservice.model.CashBatchPutFileRequest;
import com.rogers.cashintegration.bpsservice.dto.TokenPanEntry;
import com.rogers.cashintegration.bpsservice.service.CSProcessService;
import com.rogers.cashintegration.bpsservice.util.BpsConstants;
import com.rogers.cashintegration.bpsservice.util.XmlUtils;

import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.JAXBException;
import jakarta.xml.bind.Marshaller;
import lombok.extern.slf4j.Slf4j;


//catch block needs to write

@Service
@Slf4j
public class CSProcessServiceImpl implements CSProcessService{
	private static final Logger logger = LoggerFactory.getLogger(CSProcessServiceImpl.class);
	@Autowired
	private RestTemplate restTemplate;
	
	@Autowired
	private ErrorAlertNotificationProcessor errorAlertNotificationProcessor;
	
	@Value("${cs.process.cs_process_de_token_uri}")
    private String csProcessDeTokenUri;
	
	@Value("${batch.cpt.localFilePrefix}")
    private String batchCptLocalFilePrefix;
	
	@Value("${batch.amex.int_27.localFilePrefix}")
    private String batchAmexLocalFilePrefix;
	

	@Value("${batch.get.fileType.cpt}")
    private String batchCptFileType;
	
	@Value("${batch.get.fileType.amex.int_27}")
    private String batchAmex27FileType;
	
	@Override
	public byte[] performDetokanization(CashBatchPutFileRequest cashBatchPutFileRequestType, List<TokenPanEntry> tokenPanEntryList,  String attachmentStr,String fileName) throws IOException {
		CSProcessResponse csProcessResponse = null;
		String fileContentsWithPan = null;
		Map<String, String> tokentoPanMap = new HashMap<>();
		try {
			CSProcessRequest csProcessRequest = new CSProcessRequest();
			csProcessRequest.setTokenPanEntryList(tokenPanEntryList);
			csProcessResponse = callCSDeTokenizeService(csProcessRequest);
			List<TokenPanEntry> successfulTokens = csProcessResponse.getSuccessfulEntries();
			if(!CollectionUtils.isEmpty(successfulTokens) && tokenPanEntryList.size() == successfulTokens.size()) {
				logger.info("BPS|BATCH_PUT|Number of successfully detokenized PANs are {}", successfulTokens.size()); 
				tokentoPanMap =  getTokenToPanMap(successfulTokens);
			
				if(cashBatchPutFileRequestType.getFileProcessId().equals(batchAmex27FileType)) {
					fileContentsWithPan = replaceTokenWithPanAmex(successfulTokens,attachmentStr,tokentoPanMap);
				}else if(cashBatchPutFileRequestType.getFileProcessId().equals(batchCptFileType)) {
					fileContentsWithPan = replaceTokenWithPanCPT(successfulTokens,attachmentStr,tokentoPanMap);
				}
			}else if(!CollectionUtils.isEmpty(csProcessResponse.getFailedEntries())) {
					throw new CashIntegrationException(CashIntegrationErrorCode.CS_RETURNED_ERROR, Arrays.deepToString(csProcessResponse.getFailedEntries().toArray()));
			}
		}catch(CashIntegrationException ex) {
			 logger.error("|BPS|BATCH_PUT|DeTokenization_Flow|Exception: {}", ExceptionUtils.getStackTrace(ex));
			if(cashBatchPutFileRequestType.getFileProcessId().equals(batchAmex27FileType)) {
				 errorAlertNotificationProcessor.generateErrorAlert(ex, ErrorAlertConstants.BATCH_AMEX_OUT_DETOK_ERR_ALERT_STR);
				 errorAlertNotificationProcessor.generateErrorFile(ex, batchAmexLocalFilePrefix, fileName);
			}else if(cashBatchPutFileRequestType.getFileProcessId().equals(batchCptFileType)) {
				errorAlertNotificationProcessor.generateErrorAlert(ex, ErrorAlertConstants.BATCH_CPT_OUT_DETOK_ERR_ALERT_STR);
				errorAlertNotificationProcessor.generateErrorFile(ex, batchCptLocalFilePrefix, fileName);
			}
		}
		if(fileContentsWithPan != null) {
			return fileContentsWithPan.getBytes();
		}
		return new byte[0];
	}

	private String replaceTokenWithPanCPT(List<TokenPanEntry> successfulTokens, String attachmentStr,
			Map<String, String> tokentoPanMap) throws IOException {

		BufferedReader reader = null;
		String source = null;
		
		int noOfTokensDetokenised = 0;
		int noOfLines = 0;
		int noRecordsDidNotQualify =0;
		StringBuilder sb = new StringBuilder();
		try {
			reader  = new BufferedReader(new StringReader(attachmentStr));
			while ((source = reader.readLine()) != null) {
				noOfLines++;
				if (source.startsWith(BpsConstants.PAYMENT_STRING_PREFIX)) { 
					if (source.length() < BpsConstants.CPT_TOKEN_END_INDEX) {
						throw new CashIntegrationException(CashIntegrationErrorCode.TOKEN_INFER_ERROR, String.format("The line %s is invalid", noOfLines));
					    }
					String token = StringUtils.stripEnd(source.substring((BpsConstants.CPT_TOKEN_START_INDEX - 1), BpsConstants.CPT_TOKEN_END_INDEX), String.valueOf(BpsConstants.PADDING_CHAR));
				    String pan = tokentoPanMap.get(token);
				 // right pads the pan to the required length. Default is
				    // 19
				    String paddedPan = StringUtils.rightPad(pan, (BpsConstants.CPT_TOKEN_END_INDEX - BpsConstants.CPT_TOKEN_START_INDEX + 1), BpsConstants.PADDING_CHAR);
				 // replace the token with the padded pan
				    source = StringUtils.overlay(source, paddedPan, (BpsConstants.CPT_TOKEN_START_INDEX - 1), BpsConstants.CPT_TOKEN_END_INDEX );
				    sb.append(source);

				    noOfTokensDetokenised++;
				}else {
					sb.append(source);
					noRecordsDidNotQualify++;
				}
				
				sb.append(BpsConstants.LINE_SEPARATOR);
			}if(CollectionUtils.isEmpty(successfulTokens)) {
				logger.info("No Tokens to replace in this batch (CPT 243424) file");
			}else {
				logger.info("BPS|BATCH_PUT|Total number of Tokens De-tokenised in this batch (CPT 243424) file=>{} ",noOfTokensDetokenised);
				logger.info("BPS|BATCH_PUT|Total number of records(lines) in this batch (CPT 243424) file not considered for De-tokenisation "
						+ "becaused they are not of length "+BpsConstants.PAYMENT_RECORD_LENGTH+ " => {} ",noRecordsDidNotQualify);
			}
			
			
		}catch(CashIntegrationException ex) {
			throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, ex);
			
		}finally {
			try {
				if (reader != null) {
					reader.close();
				}
			} catch (Exception e) {
				logger.warn("BPS|Exception thrown when closing the reader object opened on the batch file", e);
			}
		}
		return sb.toString();
		
	
		
	}

	private String replaceTokenWithPanAmex(List<TokenPanEntry> successfulTokens, String attachmentStr, Map<String, String> tokentoPanMap) throws IOException {
		String source = null;
		
		int noTokensDeTokenised = 0;
		int noRecordsDidNotQualify = 0;
		StringBuilder sb = new StringBuilder();
		try(BufferedReader reader= new BufferedReader(new StringReader(attachmentStr))) {
			while ((source = reader.readLine()) != null) {
				
				if(CollectionUtils.isEmpty(successfulTokens)) {
					sb.append(source);
				} else {	
					if (source.length() == BpsConstants.PAYMENT_RECORD_LENGTH) {
						String start = source.substring(0, BpsConstants.AMEX_TOKEN_START_INDEX - 1);
						String token = source.substring(BpsConstants.AMEX_TOKEN_START_INDEX - 1, BpsConstants.AMEX_TOKEN_END_INDEX);
						String end = source.substring(BpsConstants.AMEX_TOKEN_END_INDEX);
		
						if(CollectionUtils.isEmpty(tokentoPanMap)) {
							throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, "De-tokenised Token-to-Pan entries are missing");
						}
						
						String pan = tokentoPanMap.get(token);
						
						if(pan == null) {
							throwDetokenisationIncompleteException();
						}
						sb.append(start);
						sb.append(pan);
						sb.append(end);
						++noTokensDeTokenised;
						
					} else {
						if(logger.isDebugEnabled()) {
							logger.debug("BPS|BATCH_PUT|Record length is not equal to {} hence token replacement not required", BpsConstants.PAYMENT_RECORD_LENGTH);
						}
						
						sb.append(source);
						++noRecordsDidNotQualify;
					}
					
				}
				sb.append(BpsConstants.AMEX_LINE_SEPARATOR);
			}if(CollectionUtils.isEmpty(successfulTokens)) {
				logger.info("No Tokens to replace in this batch (Amex INT-27) file");
			}else {
				logger.info("BPS|BATCH_PUT|Total number of Tokens De-tokenised in this batch (Amex INT-27) file=> {} ",noTokensDeTokenised);
				logger.info("BPS|BATCH_PUT|Total number of records(lines) in this batch (Amex INT-27) file not considered for De-tokenisation "
						+ "becaused they are not of length {} => {} ",BpsConstants.PAYMENT_RECORD_LENGTH,noRecordsDidNotQualify);
			}
		}catch(CashIntegrationException ex) {
			throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, ex);
			
		} 
		return sb.toString();
		
	}

	private Map<String, String> getTokenToPanMap(List<TokenPanEntry> successfulTokens) {
		Map<String, String> tokentoPan = new HashMap<>();
		for (TokenPanEntry tpe : successfulTokens) {
		    if (tpe == null || tpe.getToken() == null) {
			  throwDetokenisationIncompleteException();
		    }
		    tokentoPan.put(tpe.getToken(), tpe.getPan());
		}
		return tokentoPan;
	}

	private void throwDetokenisationIncompleteException() throws CashIntegrationException {
		throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR,
				"One of the Token entry has not been De-tokenised");
	}
	
	@Override
	public CSProcessResponse callCSDeTokenizeService(CSProcessRequest csProcessRequest) {
		ResponseEntity<CSProcessResponse> response ;
		String xmlRequest = null;
		try {
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_XML);
			headers.set("messageId", MDC.get("requestId"));
			headers.add("caller", "BPS");
			String xmlRequestBody = convertJavaObjectToXml(csProcessRequest);
			
			HttpEntity<String> entity = new HttpEntity<>(xmlRequestBody, headers);
			ResponseEntity<String> responseStr = restTemplate.postForEntity(csProcessDeTokenUri, entity, String.class);
			String csProcessResponseString = responseStr.getBody();
			CSProcessResponse csProcessResponse =  XmlUtils.unmarshal(csProcessResponseString, CSProcessResponse.class);
			if (csProcessResponse == null) {
                logger.error("|BPS|BATCH_PUT|CS-Detokenization|De-tokenization Failed; Received null form cs-process!");
                throw new CashIntegrationException(CashIntegrationErrorCode.TOKEN_INFER_ERROR, "Received null response from cs-process");
            }
            if (!csProcessResponse.isSuccessful()) {
                logger.error("|BPS|BATCH_PUT|CS-Detokenization|De-tokenization Failed; {}", csProcessResponse.getCashIntegrationException().getErrorDetails());
                throw new CashIntegrationException(CashIntegrationErrorCode.TOKEN_INFER_ERROR, "Received unsuccessfully response from cs-process" + csProcessResponse.getCashIntegrationException().getErrorDetails());
            }
            return csProcessResponse;
		}catch (Exception ex) {
            throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, "Received error while calling to cs-process!",ex);
        }
        
	}
	private String convertJavaObjectToXml(CSProcessRequest csProcessRequest) {
		StringWriter stringWriter = new StringWriter();
		try {
			JAXBContext context = JAXBContext.newInstance(CSProcessRequest.class);
			Marshaller marshaller = context.createMarshaller();
			marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, true);
			marshaller.marshal(csProcessRequest, stringWriter);
			logger.debug("|BPS|BATCH_PUT|CS-Detokenization Payload  {}",stringWriter.toString());
		} catch (JAXBException ex) {
			throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, "Received error while calling performing marshalling of CS request!",ex);
		}
		return stringWriter.toString();
	}
}
