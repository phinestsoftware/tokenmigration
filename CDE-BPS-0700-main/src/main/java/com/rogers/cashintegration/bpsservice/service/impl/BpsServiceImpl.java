package com.rogers.cashintegration.bpsservice.service.impl;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.apache.commons.compress.compressors.CompressorException;
import org.apache.commons.compress.compressors.CompressorOutputStream;
import org.apache.commons.compress.compressors.CompressorStreamFactory;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.mime.HttpMultipartMode;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.logging.log4j.util.Strings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.web.multipart.MultipartFile;

import com.rogers.cashintegration.bpsservice.exception.CashIntegrationErrorCode;
import com.rogers.cashintegration.bpsservice.exception.CashIntegrationException;
import com.rogers.cashintegration.bpsservice.exception.ErrorAlertConstants;
import com.rogers.cashintegration.bpsservice.exception.ErrorAlertNotificationProcessor;
import com.rogers.cashintegration.bpsservice.integration.BpsPutIntegrationFlow.BpsGateway;
import com.rogers.cashintegration.bpsservice.model.BatchDownloadType;
import com.rogers.cashintegration.bpsservice.model.CashBatchGetFileRequest;
import com.rogers.cashintegration.bpsservice.model.CashBatchGetFileResponse;
import com.rogers.cashintegration.bpsservice.model.CashBatchListFilesResponse;
import com.rogers.cashintegration.bpsservice.model.CashBatchPutFileRequest;
import com.rogers.cashintegration.bpsservice.model.CashBatchPutFileResponse;
import com.rogers.cashintegration.bpsservice.model.ErrorType;
import com.rogers.cashintegration.bpsservice.model.FileNameListType;
import com.rogers.cashintegration.bpsservice.model.FormatType;
import com.rogers.cashintegration.bpsservice.model.ResultType;
import com.rogers.cashintegration.bpsservice.service.BPSService;
import com.rogers.cashintegration.bpsservice.service.BpsFileProcessService;
import com.rogers.cashintegration.bpsservice.service.CSProcessService;
import com.rogers.cashintegration.bpsservice.util.BpsConstants;
import com.rogers.cashintegration.bpsservice.util.BpsUtil;
import com.rogers.cashintegration.bpsservice.util.EncryptDecryptHelper;

import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.JAXBException;
import jakarta.xml.bind.Marshaller;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class BpsServiceImpl implements BPSService {

	@Autowired
	public BpsGateway bpsGateway;
	
	@Autowired
	private BpsFileProcessService bpsFileProcessService;
	
	@Value("${batch.get.oldFileSuffix}")
    private String oldFileSuffix;
	
	@Value("${cde.batch.local.storage.path}")
    private String cdeStoragePath;
	
	@Value("${batch.list.fileAge}")
    private long fileAge;
	
	@Value("${batch.cpt.localFilePrefix}")
    private String batchCptLocalFilePrefix;
	
	@Value("${batch.amex.int_27.localFilePrefix}")
    private String batchInt27LocalFilePrefix;
	
	@Value("${batch.amex.int_26.localFilePrefix}")
    private String batchInt26LocalFilePrefix;
	
	@Value("${batch.amex.int_35.localFilePrefix}")
    private String batchInt35LocalFilePrefix;
	
	@Value("${batch.get.fileType.cpt}")
    private String batchCptFileType;
	
	@Value("${batch.get.fileType.Paymentech}")
    private String batchPaymentechFileType;
	
	
	@Value("${batch.get.fileType.amex.int_27}")
    private String batchAmex27FileType;
	
	@Value("${batch.get.fileType.amex.int_26}")
    private String batchAmex26FileType;
	
	@Value("${batch.get.fileType.amex.int_35}")
    private String batchAmex35FileType;
	
	@Value("${batch.get.suffixes}")
    private String batchGetSuffixes;
	
	
	@Autowired
	private ErrorAlertNotificationProcessor errorAlertNotificationProcessor;
	
	private static final Logger logger = LoggerFactory.getLogger(BpsServiceImpl.class);
	
	
	
	@Override
	public CashBatchPutFileResponse processBatchPutFile(CashBatchPutFileRequest cashBatchPutFileRequestType,
			MultipartFile file) throws IOException {
		final SimpleDateFormat sdf1 = new SimpleDateFormat("EEE, d MMM yyyy HH:mm:ss Z");
		logger.info("cashBatchPutFileRequest {}" , cashBatchPutFileRequestType);
		CashBatchPutFileResponse cashBatchPutFileResponse = new CashBatchPutFileResponse();
		try {
			if (!file.isEmpty()) {
				if (isValidFileProcessId(cashBatchPutFileRequestType)) {
					if (isValidFileFormat(cashBatchPutFileRequestType)) {
						if (cashBatchPutFileRequestType.getFileName().isEmpty()) {
							throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR,
									"FileName can't be empty");
						}

						logger.info("BPS|BATCH_PUT|Attachment is in TXT or ZIP format");
						String batchId = UUID.randomUUID().toString();
						logger.info("BPS|BATCH_PUT|batch_async_outbound|ENTRY");
						logger.info("BPS|BATCH_PUT|Batch ID=> {}|Filename=> {}" , batchId , cashBatchPutFileRequestType.getFileName());
						String attachmentStr = fetchFileContent(cashBatchPutFileRequestType, file);
						if (StringUtils.isEmpty(attachmentStr)) {
							throw new CashIntegrationException(CashIntegrationErrorCode.BATCH_PUT_MALFORMED_REQUEST, "BPS|BATCH_PUT|Unable to read the batch file "
									+ "attachment set against key attachment in the request");
						}else {
							
							cashBatchPutFileResponse.setResult(ResultType.SUCCESS);
							cashBatchPutFileResponse.setTraceId(MDC.get(BpsConstants.REQUEST_ID));
							cashBatchPutFileResponse.setBatchId(batchId);
							Timestamp timestamp = new Timestamp(System.currentTimeMillis());
							
							cashBatchPutFileResponse.setInfo("batch file " +file.getOriginalFilename()+ " successfully received at"+sdf1.format(timestamp));
							logger.info("BPS|BATCH_PUT|queue_batchreq_and_return|Generate Batch ID");

							//call async to process file
							bpsFileProcessService.processFileforBatchPut(attachmentStr,cashBatchPutFileRequestType,file,batchId);
							return cashBatchPutFileResponse;
						}
						
						
					} else {
						logger.error("BPS|BATCH_PUT|Unexpected file format {} . Return error.." , cashBatchPutFileRequestType.getFormatId());
						buildErrorResponse(cashBatchPutFileResponse,
								CashIntegrationErrorCode.BATCH_PUT_MALFORMED_REQUEST);
					}
				} else {
					logger.error("BPS|BATCH_PUT|Unexpected file processId {} . Return error.. "
							, cashBatchPutFileRequestType.getFileProcessId());
					buildErrorResponse(cashBatchPutFileResponse, CashIntegrationErrorCode.BATCH_PUT_MALFORMED_REQUEST);

				}
			} else {
				logger.error("BPS|BATCH_PUT| Attachment not found. Return error..");
				buildErrorResponse(cashBatchPutFileResponse, CashIntegrationErrorCode.BATCH_PUT_MALFORMED_REQUEST);

			}
		} catch (CashIntegrationException ex) {
			logger.error("BPS|BATCH_PUT| Exception occurred in BPS PUT flow");
			throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, ex);
		}

		return cashBatchPutFileResponse;

	}

	private String fetchFileContent(CashBatchPutFileRequest cashBatchPutFileRequestType, MultipartFile file) {
		// Copy Attachment to outbound txt flow started

		String attachmentStr = null;
		InputStream inputStream = null;
		try {
			if (cashBatchPutFileRequestType.getFormatId().equals(BpsConstants.FILE_FORMAT_TXT)) {
				inputStream = file.getInputStream();

				if (inputStream != null) {
					attachmentStr = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
				}
			} else if (cashBatchPutFileRequestType.getFormatId().equals(BpsConstants.FILE_FORMAT_ZIP)) {
				byte[] bytes = BpsUtil.decompressGzipToBytes(file);
				attachmentStr = new String(bytes, StandardCharsets.UTF_8);
			} else {
				throw new CashIntegrationException(CashIntegrationErrorCode.BATCH_PUT_MALFORMED_REQUEST,
						"Invalid file format Id used");
			}

			logger.info("BPS|batch_put|Attachment transferred to outbound scope.");
			// Copy Attachment to outbound txt flow ended
			logger.info("BPS|batch_put|queue_batchreq_and_return|Generate Batch ID");
			logger.info("BPS|batch_put|queue_batchreq_and_return|Queue batch request for Batch outbound processing");

			if (StringUtils.isEmpty(attachmentStr)) {
				throw new CashIntegrationException(CashIntegrationErrorCode.BATCH_PUT_MALFORMED_REQUEST,
						"Unable to get a handle on the attachment inputstream");

			}
		} catch (CashIntegrationException | IOException ex) {
			logger.error("BPS|batch_put| Exception occurred in BPS PUT flow");
			throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, ex);
		}
		return attachmentStr;

	}

	private void buildErrorResponse(CashBatchPutFileResponse cashBatchPutFileResponse,
			CashIntegrationErrorCode errorDetails) {
		cashBatchPutFileResponse.setResult(ResultType.FAIL);
		cashBatchPutFileResponse.setTraceId(MDC.get(BpsConstants.REQUEST_ID));
		cashBatchPutFileResponse.setInfo("Batch processing failed");

		ErrorType errortype = new ErrorType();
		errortype.setCode(errorDetails.getCode());
		errortype.setDesc(errorDetails.getDescription());
		errortype.setRemedy(errorDetails.getRemedy());
		cashBatchPutFileResponse.setError(errortype);
	}

	public boolean isValidFileProcessId(CashBatchPutFileRequest cashBatchPutFileRequestType) {
		if (Strings.isNotEmpty(cashBatchPutFileRequestType.getFileProcessId())
				&& Arrays.asList(batchAmex27FileType, batchCptFileType)
						.contains(cashBatchPutFileRequestType.getFileProcessId())) {
			return true;
		}
		return false;
	}

	public boolean isValidFileFormat(CashBatchPutFileRequest cashBatchPutFileRequestType) {
		// need to add a check if fileFormat id is not present
		if (Arrays.asList(BpsConstants.FILE_FORMAT_TXT, BpsConstants.FILE_FORMAT_ZIP)
				.contains(cashBatchPutFileRequestType.getFormatId())) {
			return true;
		}
		return false;
	}

	@Override
	public CashBatchListFilesResponse listFilesFromCdeStore() throws IOException {
		CashBatchListFilesResponse  cashBatchListFilesResponse = new CashBatchListFilesResponse();
		try {
			Set<String> fileSet = BpsUtil.listFileNamesFromCdeStore(cdeStoragePath, oldFileSuffix, fileAge,batchGetSuffixes);
		   
			cashBatchListFilesResponse.setResult(ResultType.SUCCESS);
		    cashBatchListFilesResponse.setTraceId(MDC.get(BpsConstants.REQUEST_ID));
		    
		    if(!CollectionUtils.isEmpty(fileSet)) {
		    	FileNameListType fileNameListType = new FileNameListType();
		    	fileNameListType.setFileName(List.copyOf(fileSet));
		    	cashBatchListFilesResponse.setFileNames(fileNameListType);
		    }
		    if (logger.isDebugEnabled()) {
		    	logger.debug("BPS|BATCH_LIST|Response object created successfully");
			}
		    logger.info("BPS|BATCH_LIST|Returning list of filenames in given dir");
		}catch(CashIntegrationException ex) {
			logger.error("BPS|BATCH_LIST| Exception occurred in BPS PUT flow");
			cashBatchListFilesResponse.setResult(ResultType.FAIL);
			cashBatchListFilesResponse.setTraceId(MDC.get(BpsConstants.REQUEST_ID));
			ErrorType errortype = new ErrorType();
			errortype.setCode(CashIntegrationErrorCode.CDE_INTERNAL_ERROR.getCode());
			errortype.setDesc(CashIntegrationErrorCode.CDE_INTERNAL_ERROR.getDescription());
			errortype.setRemedy(CashIntegrationErrorCode.CDE_INTERNAL_ERROR.getRemedy());
			cashBatchListFilesResponse.setError(errortype);
			throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, ex);
		
		} 
			return cashBatchListFilesResponse;
		    
		}

	@Override
	public byte[] getFileFromCdeStore(CashBatchGetFileRequest cashBatchGetFileRequest) throws IOException, JAXBException {
		String 	attachmentFileName = null;
		MultipartEntityBuilder meb = MultipartEntityBuilder.create();
		byte[] responseBytes = null;
		CashBatchGetFileResponse cashBatchGetFileResponse = new CashBatchGetFileResponse();
		try {
			BatchDownloadType batchDownload = new BatchDownloadType();
			if (StringUtils.isNotEmpty(cashBatchGetFileRequest.getFormatId().value())
					&& (BpsConstants.FILE_FORMAT_TXT.equals(cashBatchGetFileRequest.getFormatId().value())
							|| BpsConstants.FILE_FORMAT_ZIP.equals(cashBatchGetFileRequest.getFormatId().value()))) {
				logger.info("BPS|BATCH_GET|File format selected from request: {}" , cashBatchGetFileRequest.getFormatId());
				batchDownload.setFormatId(cashBatchGetFileRequest.getFormatId());

			} else {
				logger.info("BPS|BATCH_GET| Default file type selected:" + BpsConstants.FILE_FORMAT_TXT);
				batchDownload.setFormatId(FormatType.TXT);
			}
			
			File attachmentFile = getFileToAttach(cashBatchGetFileRequest.getFileName());
			logger.info("BPS|BATCH_GET|Attempting to get the correct file and construct the multipart response");
			if(attachmentFile == null) {
				logger.warn("BPS|BATCH_GET|File is null");
				
				meb.addTextBody(BpsConstants.BATCH_MESSAGE_PAYLOAD_PARAMETER_KEY,
						constructPayloadResponseXml(null, null), ContentType.APPLICATION_XML);
				} else {
					attachmentFileName = attachmentFile.getName();
	
					meb.setMode(HttpMultipartMode.STRICT);
					if (batchDownload.getFormatId().value().equals(BpsConstants.FILE_FORMAT_TXT)) {
						logger.trace("BPS|BATCH_GET|Attempting to attach the file in TXT format");
						meb.addBinaryBody(BpsConstants.BATCH_MESSAGE_ATTACHMENT_PARAMETER_KEY, attachmentFile,
								ContentType.TEXT_PLAIN, attachmentFileName);
					} else {
						logger.trace("BPS|BATCH_GET|Attempting to attach the file in ZIP format");
						byte[] compressedFileData = gzipCompressToByteArray(attachmentFile);
	
						meb.addBinaryBody(BpsConstants.BATCH_MESSAGE_ATTACHMENT_PARAMETER_KEY, compressedFileData,
								ContentType.APPLICATION_OCTET_STREAM, attachmentFileName);
					}
					meb.addTextBody(BpsConstants.BATCH_MESSAGE_PAYLOAD_PARAMETER_KEY,
							constructPayloadResponseXml(attachmentFileName, batchDownload), ContentType.APPLICATION_XML);
					
				}
				responseBytes = convertMultiPartToByteArray(meb);
				if(responseBytes != null && attachmentFile != null) {
					bpsFileProcessService.renameFileAfterBatchGet(attachmentFile, oldFileSuffix);
				}
			}catch (CashIntegrationException ex ) {
				logger.error("BPS|BATCH_GET| Error occurred while fetching the file {}", ExceptionUtils.getStackTrace(ex));
				 errorAlertNotificationProcessor.generateErrorAlert(ex,ErrorAlertConstants.BATCH_GET_ERR_ALERT_STR);
				 meb.addTextBody(BpsConstants.BATCH_MESSAGE_PAYLOAD_PARAMETER_KEY,
						 buildErrorResponseForGetAPI(cashBatchGetFileResponse,CashIntegrationErrorCode.CDE_INTERNAL_ERROR), ContentType.APPLICATION_XML);
				 responseBytes = convertMultiPartToByteArray(meb);
				
			} catch (CompressorException ex) {
				logger.error("BPS|BATCH_GET| Error occurred while compressing  the file {}", ExceptionUtils.getStackTrace(ex));
				 errorAlertNotificationProcessor.generateErrorAlert(ex,ErrorAlertConstants.BATCH_GET_ERR_ALERT_STR);
				 meb.addTextBody(BpsConstants.BATCH_MESSAGE_PAYLOAD_PARAMETER_KEY,
						 buildErrorResponseForGetAPI(cashBatchGetFileResponse,CashIntegrationErrorCode.CDE_INTERNAL_ERROR), ContentType.APPLICATION_XML);
				 responseBytes = convertMultiPartToByteArray(meb);
			}
			catch (Exception ex ) {
			logger.error("BPS|BATCH_GET| Error occurred while perfoming get operation {}", ExceptionUtils.getStackTrace(ex));
			 errorAlertNotificationProcessor.generateErrorAlert(ex,ErrorAlertConstants.BATCH_GET_ERR_ALERT_STR);
			 meb.addTextBody(BpsConstants.BATCH_MESSAGE_PAYLOAD_PARAMETER_KEY,
					 buildErrorResponseForGetAPI(cashBatchGetFileResponse,CashIntegrationErrorCode.CDE_INTERNAL_ERROR), ContentType.APPLICATION_XML);
			 responseBytes = convertMultiPartToByteArray(meb);
			
		}
			
			return responseBytes;
			
		}
	
	private String buildErrorResponseForGetAPI(CashBatchGetFileResponse cashBatchGetFileResponse,
			CashIntegrationErrorCode errorDetails) throws JAXBException {
		cashBatchGetFileResponse.setResult(ResultType.FAIL);
		cashBatchGetFileResponse.setTraceId(MDC.get(BpsConstants.REQUEST_ID));

		ErrorType errortype = new ErrorType();
		errortype.setCode(errorDetails.getCode());
		errortype.setDesc(errorDetails.getDescription());
		errortype.setRemedy(errorDetails.getRemedy());
		cashBatchGetFileResponse.setError(errortype);
		 JAXBContext jaxbContext = JAXBContext.newInstance(CashBatchGetFileResponse.class);
		    Marshaller marshaller = jaxbContext.createMarshaller();
		    StringWriter stringWriter = new StringWriter();
		    marshaller.marshal(cashBatchGetFileResponse, stringWriter);
		    String xmlString = stringWriter.toString();
		    return xmlString;
	}

	private byte[] convertMultiPartToByteArray(MultipartEntityBuilder multipartEntityBuilder) throws IOException {
		ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
		multipartEntityBuilder.build().writeTo(outputStream);
		
		return outputStream.toByteArray();
	}

	private String constructPayloadResponseXml(String attachmentFileName, BatchDownloadType batchDownload) throws JAXBException {

		CashBatchGetFileResponse cashBatchGetFileResponse = new CashBatchGetFileResponse();
		cashBatchGetFileResponse.setResult(ResultType.SUCCESS);
		cashBatchGetFileResponse.setTraceId(MDC.get(BpsConstants.REQUEST_ID));
		if(StringUtils.isNotEmpty(attachmentFileName) && batchDownload != null)	{
			String filePrefix = null;
			if (attachmentFileName.startsWith(batchCptLocalFilePrefix)) {
				batchDownload.setFileType(batchPaymentechFileType);
				filePrefix = batchCptLocalFilePrefix;
			} else if (attachmentFileName.startsWith(batchInt26LocalFilePrefix)) {
				batchDownload.setFileType(batchAmex26FileType);
				filePrefix = batchInt26LocalFilePrefix;
			} else if (attachmentFileName.startsWith(batchInt27LocalFilePrefix)) {
				batchDownload.setFileType(batchAmex27FileType);
				filePrefix = batchInt27LocalFilePrefix;
			} else if (attachmentFileName.startsWith(batchInt35LocalFilePrefix)) {
				batchDownload.setFileType(batchAmex35FileType);
				filePrefix = batchInt35LocalFilePrefix;
			} else {
				throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR,
						"Unable to infer file type from file prefix on Batch Get");
			}
		    attachmentFileName = StringUtils.removeStart(attachmentFileName, filePrefix);
		    batchDownload.setFileAttached(attachmentFileName);
		    cashBatchGetFileResponse.setBatchDownload(batchDownload);
		}
	    JAXBContext jaxbContext = JAXBContext.newInstance(CashBatchGetFileResponse.class);
	    Marshaller marshaller = jaxbContext.createMarshaller();
	    StringWriter stringWriter = new StringWriter();
	    marshaller.marshal(cashBatchGetFileResponse, stringWriter);
	    String xmlString = stringWriter.toString();
		return xmlString;
	}
	
	  /**
     * Attempts to retrieve a file to attached based on the provided file name.<br/>
     * If the name is null or does not exist, the oldest file in the dir will be returned instead.
     * <br/>
     * If there are no files to return then the result will be null.
     * <br/>
     * 
     * @param fileName {@link String} - The file name provided by the flow variables
	 * @return {@link File} The file that was found based on the above rules, null if no file was found.
     * @throws CashIntegrationException - if the file to attach could not be fetched from the configured file storage path
     */
	private File getFileToAttach(String fileName) throws IOException {
		File fileToReturn = null;
		try {
			logger.info("BPS|BATCH_GET|Attempting to get the file name from the request");
		StringBuilder filePath = new StringBuilder();
		if(StringUtils.isNotEmpty(fileName)) {
			logger.info("BPS|BATCH_GET|File name from request:{}",fileName);
			filePath = filePath.append(fileName);
			 fileToReturn = BpsUtil.getFileFromCdeStore(cdeStoragePath, filePath.toString());
			if (fileToReturn == null || !fileToReturn.exists()) {
				fileToReturn = BpsUtil.getOldestFileFromCdeStore(cdeStoragePath, oldFileSuffix, fileAge, batchGetSuffixes);
			}
		}else {
			 fileToReturn = BpsUtil.getOldestFileFromCdeStore(cdeStoragePath, oldFileSuffix, fileAge, batchGetSuffixes);
		}	
		
		}catch(CashIntegrationException ex) {
			logger.error("BPS|BATCH_GET| Error occurred while fetching the file");
			throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, ex );
		}
		
		return fileToReturn;
	}
	
	/**
     * This method takes a file and compresses it using the GZIP format.
     * 
     * @param fileToCompress
     *            {@link File} - The file to compress
     * @return {@link byte[]} - a byte array representing the contents of the
     *         compressed file
     * @throws CompressorException
     *             - If an error occurs during compression
     * @throws IOException
     *             - If the input file doesn't exist or if there is an error
     *             during read/write
     */
    private byte[] gzipCompressToByteArray(File fileToCompress) throws CompressorException, IOException {
	ByteArrayOutputStream out = null;
	CompressorOutputStream cos = null;
	try (FileInputStream fin = new FileInputStream(fileToCompress)) {
	    out = new ByteArrayOutputStream();

	    cos = new CompressorStreamFactory().createCompressorOutputStream(CompressorStreamFactory.GZIP, out);
	    IOUtils.copy(fin, cos);
	    cos.close();

	    return out.toByteArray();
	}
    }

}
