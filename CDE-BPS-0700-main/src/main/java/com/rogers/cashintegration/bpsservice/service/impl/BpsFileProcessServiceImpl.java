package com.rogers.cashintegration.bpsservice.service.impl;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.integration.file.FileHeaders;
import org.springframework.integration.support.MessageBuilder;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.web.multipart.MultipartFile;

import com.rogers.cashintegration.bpsservice.exception.CashIntegrationErrorCode;
import com.rogers.cashintegration.bpsservice.exception.CashIntegrationException;
import com.rogers.cashintegration.bpsservice.exception.ErrorAlertConstants;
import com.rogers.cashintegration.bpsservice.exception.ErrorAlertNotificationProcessor;
import com.rogers.cashintegration.bpsservice.integration.BpsPutIntegrationFlow.BpsGateway;
import com.rogers.cashintegration.bpsservice.model.CashBatchPutFileRequest;
import com.rogers.cashintegration.bpsservice.dto.TokenPanEntry;
import com.rogers.cashintegration.bpsservice.service.BpsFileProcessService;
import com.rogers.cashintegration.bpsservice.service.CSProcessService;
import com.rogers.cashintegration.bpsservice.util.BpsConstants;
import com.rogers.cashintegration.bpsservice.util.EncryptDecryptHelper;

import lombok.extern.slf4j.Slf4j;


@Service
@Slf4j
public class BpsFileProcessServiceImpl implements BpsFileProcessService{
	private static final Logger logger = LoggerFactory.getLogger(BpsFileProcessServiceImpl.class);
	@Autowired
	private CSProcessService csProcessService;
	
	@Autowired
	private EncryptDecryptHelper encryptDecryptHelper;
	@Autowired
	public BpsGateway bpsGateway;
	@Autowired
	private ErrorAlertNotificationProcessor errorAlertNotificationProcessor;
	
	@Value("${batch.cpt.localFilePrefix}")
    private String batchCptLocalFilePrefix;
	
	@Value("${batch.amex.int_27.localFilePrefix}")
    private String batchAmexLocalFilePrefix;
	
	@Value("${batch.get.fileType.cpt}")
    private String batchCptFileType;
	
	@Value("${batch.get.fileType.amex.int_27}")
    private String batchAmex27FileType;
	
	@Value("${batch.amex.int_27.filename}")
    private String batchAmex27FileName;
	
	@Value("${batch.cpt.upload.dir}")
    private String batchCptUploadDir;
	

	@Value("${batch.amex.int_27.upload.dir}")
    private String batchAmexUploadDir;
	
	@Override
	@Async
	public void processFileforBatchPut(String attachmentStr, CashBatchPutFileRequest cashBatchPutFileRequestType,
			MultipartFile file, String batchId) throws IOException {
		String cptFileNamePrefixT = null;
		logger.info("BPS|BATCH_PUT|queue_batchreq_and_return|Queue batch request for Batch outbound processing");
		List<TokenPanEntry> tokenPanEntryList = new ArrayList<>(); 
		StringBuilder paymentTechFileName = new StringBuilder(BpsConstants.PAYMENTECH_FILE_P_PREFIX);
		paymentTechFileName.append(file.getOriginalFilename());
		try {
		if(cashBatchPutFileRequestType.getFileProcessId().equals(batchAmex27FileType)) {
			logger.info("BPS|BATCH_PUT|batch_async_amex_outbound|ENTRY");
			logger.info("BPS|BATCH_PUT|batch_async_amex_outbound|Request identified as Amex INT_27");
			tokenPanEntryList = extractAmexTokenPanEntry(attachmentStr,BpsConstants.AMEX_LINE_SEPARATOR); 
		}else if(cashBatchPutFileRequestType.getFileProcessId().equals(batchCptFileType)) {
			logger.info("BPS|BATCH_PUT|batch_async_cpt_outbound|ENTRY");
			logger.info("BPS|BATCH_PUT|batch_async_cpt_outbound|Request identified as Paymentech 243424");
			tokenPanEntryList = extractTokenPanEntryList(attachmentStr,BpsConstants.LINE_SEPARATOR, BpsConstants.CPT_TOKEN_START_INDEX ,BpsConstants.CPT_TOKEN_END_INDEX); 
		}
			 
		  if(!CollectionUtils.isEmpty(tokenPanEntryList)) { // calling cs process detokenization 
			  byte[] detokanizedFileContent = csProcessService.performDetokanization(cashBatchPutFileRequestType,tokenPanEntryList,attachmentStr,file.getOriginalFilename());
			if(detokanizedFileContent != null && detokanizedFileContent.length != 0) {
			  if(cashBatchPutFileRequestType.getFileProcessId().equals(batchAmex27FileType)) {
				  byte[] encryptedFileContent =  encryptDecryptHelper.performAmexFileEncryption(detokanizedFileContent, file.getOriginalFilename());
				  logger.info("BPS|BATCH_PUT|batch_async_amex_outbound|Call Amex SFTP Service."); 
				  performAmexUpload(encryptedFileContent);
				  
			  }else {
				  logger.info("BPS|batch_async_cpt_outbound|Call CPT Batch Service."); 
				  cptFileNamePrefixT = BpsConstants.PAYMENTECH_FILE_T_PREFIX+file.getOriginalFilename();
				  performCptUpload(detokanizedFileContent, cptFileNamePrefixT, paymentTechFileName);
			  }
			}else {
				logger.error("BPS|BATCH_PUT|No content available to upload, Detokenized file content is empty");
			}
		  }
		  else {
			  if(cashBatchPutFileRequestType.getFileProcessId().equals(batchAmex27FileType)){
				  logger.info("BPS|BATCH_PUT|batch_async_amex_outbound|Call Amex SFTP Service."); 
				  byte[] encryptedFileContent =  encryptDecryptHelper.performAmexFileEncryption(attachmentStr.getBytes(), file.getOriginalFilename());
				  performAmexUpload(encryptedFileContent);
			  }else {
				  cptFileNamePrefixT = BpsConstants.PAYMENTECH_FILE_T_PREFIX+file.getOriginalFilename();
				  logger.info("BPS|BATCH_PUT|batch_async_cpt_outbound|Call CPT Batch Service.");
				  performCptUpload(attachmentStr.getBytes(), cptFileNamePrefixT, paymentTechFileName);
				  
			  }
			  
		  } 
		}catch(CashIntegrationException ex) {
			logger.error("BPS|BATCH_PUT| Exception occurred in BPS PUT flow {}", ExceptionUtils.getStackTrace(ex));
			if(cashBatchPutFileRequestType.getFileProcessId().equals(batchAmex27FileType)) {
				 errorAlertNotificationProcessor.generateErrorAlert(ex, ErrorAlertConstants.BATCH_AMEX_OUT_ERR_ALERT_STR);
				 errorAlertNotificationProcessor.generateErrorFile(ex,batchAmexLocalFilePrefix, file.getOriginalFilename());
			}else if(cashBatchPutFileRequestType.getFileProcessId().equals(batchCptFileType)) {
				errorAlertNotificationProcessor.generateErrorAlert(ex, ErrorAlertConstants.BATCH_CPT_OUT_ERR_ALERT_STR);
				errorAlertNotificationProcessor.generateErrorFile(ex, batchCptLocalFilePrefix, file.getOriginalFilename());
			}
			
		}catch(Exception ex) {
			logger.error("BPS|BATCH_PUT| Exception occurred in BPS PUT flow {}", ExceptionUtils.getStackTrace(ex));
			if(cashBatchPutFileRequestType.getFileProcessId().equals(batchAmex27FileType)) {
				 errorAlertNotificationProcessor.generateErrorAlert(ex, ErrorAlertConstants.BATCH_AMEX_OUT_ERR_ALERT_STR);
				 errorAlertNotificationProcessor.generateErrorFile(ex,batchAmexLocalFilePrefix, file.getOriginalFilename());
			}else if(cashBatchPutFileRequestType.getFileProcessId().equals(batchCptFileType)) {
				errorAlertNotificationProcessor.generateErrorAlert(ex, ErrorAlertConstants.BATCH_CPT_OUT_ERR_ALERT_STR);
				errorAlertNotificationProcessor.generateErrorFile(ex, batchCptLocalFilePrefix, file.getOriginalFilename());
			}
		}
		
	}
	
	private void performAmexUpload(byte[] encryptedFileContent) {

		try {
			bpsGateway.processPutRequest(MessageBuilder.withPayload(encryptedFileContent).setHeader(BpsConstants.FILE_TYPE, batchAmex27FileType)
					  .setHeader(BpsConstants.FILE_NAME, batchAmex27FileName)
					  .build());
			  logger.info("BPS|BATCH_PUT|batch_async_amex_outbound|Call to Amex SFTP Service is success.");
			  }catch(Exception e) {
				  logger.error(
							"BPS|BATCH_PUT|batch_async_amex_outbound|Failures detected while uploading file to the remote SFTP site {}",ExceptionUtils.getStackTrace(e));
					errorAlertNotificationProcessor.generateErrorAlert(e,
							ErrorAlertConstants.BATCH_AMEX_OUT_ERR_ALERT_STR);
					errorAlertNotificationProcessor.generateErrorFile(new CashIntegrationException(CashIntegrationErrorCode.AMEX_BATCH_SFTP_ERROR_UPLOAD,ErrorAlertConstants.FAILURE_AROSE_WHEN_UPLOADING + batchAmexUploadDir, e), null, null);
			
			  }		
			
	}

	private void performCptUpload(byte[] detokanizedFileContent, String cptFileNamePrefixT, StringBuilder paymentTechFileName) {
		try {
			  bpsGateway.processPutRequest(MessageBuilder.withPayload(detokanizedFileContent)
					  .setHeader(BpsConstants.FILE_TYPE, batchCptFileType)
					  .setHeader(FileHeaders.RENAME_TO,  paymentTechFileName.toString())
					  .setHeader(BpsConstants.FILE_NAME, cptFileNamePrefixT)
					  .build()); 
			  logger.info("BPS|BATCH_PUT|batch_async_cpt_outbound|Call to CPT Batch Service is success.");
			  }catch(Exception e) {
				  logger.error(
							"BPS|BATCH_PUT|batch_async_cpt_outbound|Failures detected while uploading file to the remote SFTP site {}",ExceptionUtils.getStackTrace(e));
					errorAlertNotificationProcessor.generateErrorAlert(e,
							ErrorAlertConstants.BATCH_CPT_OUT_ERR_ALERT_STR);
					errorAlertNotificationProcessor.generateErrorFile(new CashIntegrationException(CashIntegrationErrorCode.CPT_BATCH_SFTP_ERROR_UPLOAD,ErrorAlertConstants.FAILURE_AROSE_WHEN_UPLOADING + batchCptUploadDir, e), null, null);
			
			  }		
	}

	private List<TokenPanEntry> extractTokenPanEntryList(String attachmentStr, String lineSeparator, int tokenStartIndex,int tokenEndIndex) {
		List<TokenPanEntry> tokenPanEntryList = new ArrayList<>();
		try {
			if (attachmentStr.isEmpty()) {
				throw new CashIntegrationException(CashIntegrationErrorCode.TOKEN_INFER_ERROR,
						"Batch request is empty");
			}
			String[] lines = attachmentStr.split(lineSeparator);
			int lineNumber = 0;
			int tokenCount = 0;
			for (String line : lines) {
				lineNumber++;
				if (line.startsWith(BpsConstants.PAYMENT_STRING_PREFIX)) {
					if (line.length() < tokenEndIndex) {
						throw new CashIntegrationException(CashIntegrationErrorCode.TOKEN_INFER_ERROR,
								String.format("The line %s is invalid", lineNumber));
					}
					String token = StringUtils.stripEnd(
							line.substring((tokenStartIndex - 1), tokenEndIndex),
							String.valueOf(BpsConstants.PADDING_CHAR));
					tokenPanEntryList.add(new TokenPanEntry(token, lineNumber));
					++tokenCount;
				}
			}
			logger.info("BPS|BATCH_PUT|Number of lines in the batch file are {}", lineNumber);
			logger.info("BPS|BATCH_PUT|Total number of tokens in file is {}", tokenCount);
		} catch (CashIntegrationException e) {
			if (logger.isDebugEnabled()) {
				logger.debug("BPS|CashIntegrationException Occurred", e);
			}
		} 
		catch (Exception e) {
			throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR,
					"Exception thrown when parsing the batch file attachment for de-tokenisation", e);
		}
		return tokenPanEntryList;

	}
	
	private List<TokenPanEntry> extractAmexTokenPanEntry(String attachmentStr, String lineSeparator) {
		List<TokenPanEntry> tokenPanEntryList = new ArrayList<>();
		try {
			if (attachmentStr.isEmpty()) {
				throw new CashIntegrationException(CashIntegrationErrorCode.TOKEN_INFER_ERROR,
						"Batch request is empty");
			}
			
			

		    int lineNumber = 0;

		    String[] lines = attachmentStr.split(lineSeparator);
		    for (String line : lines) {

			lineNumber++;

			if (line.length() == BpsConstants.PAYMENT_RECORD_LENGTH) {
			    String token = line.substring(BpsConstants.AMEX_TOKEN_START_INDEX - 1, BpsConstants.AMEX_TOKEN_END_INDEX);
			    tokenPanEntryList.add(new TokenPanEntry(token, lineNumber));
			}
		    }
		    logger.info("BPS|BATCH_PUT|Number of lines in the batch file are {}", lineNumber);
			logger.info("BPS|BATCH_PUT|Total number of tokens in file is {}", tokenPanEntryList.size());
			} catch (CashIntegrationException e) {
				if (logger.isDebugEnabled()) {
					logger.debug("BPS|CashIntegrationException Occurred", e);
				}
			} 
			catch (Exception e) {
				throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR,
						"Exception thrown when parsing the batch file attachment for de-tokenisation", e);
			}
		
		return tokenPanEntryList;
		
	}

	@Override
	public void renameFileAfterBatchGet(File attachmentFile, String oldFileSuffix) throws IOException {
		logger.info("BPS|Batch Get | Renaming file after retun to download");
		Path source = Paths.get(attachmentFile.getPath());
		
		String renameFileTo = attachmentFile + oldFileSuffix;
		Path target = Paths.get(renameFileTo);
		 Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
		 
	}

}
