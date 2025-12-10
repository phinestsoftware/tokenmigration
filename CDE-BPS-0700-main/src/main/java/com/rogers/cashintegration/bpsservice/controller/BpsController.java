package com.rogers.cashintegration.bpsservice.controller;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.rogers.cashintegration.bpsservice.exception.CashIntegrationErrorCode;
import com.rogers.cashintegration.bpsservice.exception.CashIntegrationException;
import com.rogers.cashintegration.bpsservice.model.CashBatchGetFileRequest;
import com.rogers.cashintegration.bpsservice.model.CashBatchListFilesResponse;
import com.rogers.cashintegration.bpsservice.model.CashBatchPutFileRequest;
import com.rogers.cashintegration.bpsservice.model.CashBatchPutFileResponse;
import com.rogers.cashintegration.bpsservice.service.BPSService;
import com.rogers.cashintegration.bpsservice.util.EncryptDecryptHelper;
import com.rogers.cashintegration.bpsservice.util.XmlUtils;

import jakarta.xml.bind.JAXBException;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping(path = "/semafone/service/integration/rogers/batch")
@Slf4j
public class BpsController {
	@Autowired
	private EncryptDecryptHelper encryptDecryptHelper;
	@Autowired
	private BPSService bpsService;
	private static final Logger logger = LoggerFactory.getLogger(BpsController.class);

	@PostMapping(path = "put", consumes = {
			MediaType.MULTIPART_FORM_DATA_VALUE }, produces = MediaType.APPLICATION_XML_VALUE)
	public ResponseEntity<String> putBatch(@RequestPart("attachment") MultipartFile file,
			@RequestPart("payload") String request) throws IOException {
		logger.info("BPS|BATCH_PUT| Batch request received..ENTRY");
		logger.info("BPS|BATCH_PUT| Batch Put request payload {}", request);
		try {
			CashBatchPutFileResponse cashBatchPutFileResponse;

			CashBatchPutFileRequest cashBatchPutFileRequest = XmlUtils.unmarshal(request, CashBatchPutFileRequest.class);
			logger.info("CashBatchPutFileRequest Object {}" , cashBatchPutFileRequest);
			cashBatchPutFileResponse = bpsService.processBatchPutFile(cashBatchPutFileRequest, file);
			String response = XmlUtils.marshal(cashBatchPutFileResponse);
			logger.trace("BPS|BATCH_PUT|Batch Put --  EXIT");
			return ResponseEntity.ok(response);

		} catch (JAXBException ex) {
            throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, "Response marshalling failed!", ex);
        }catch (Exception ex) {
			throw new CashIntegrationException(CashIntegrationErrorCode.BATCH_PUT_MALFORMED_REQUEST, ex);
		}finally {
			logger.info("BPS|BATCH_PUT|EXIT");
		}
	}

	@PostMapping(path = "listfilenames", consumes = {
			MediaType.MULTIPART_FORM_DATA_VALUE }, produces = MediaType.APPLICATION_XML_VALUE)
	public ResponseEntity<String> listFilenames(
			@RequestPart("payload") String request) {
		logger.trace("BPS|BATCH_LIST --  ENTRY");
		try {
			CashBatchListFilesResponse cashBatchListFilesResponse = null;
			cashBatchListFilesResponse = bpsService.listFilesFromCdeStore();
			String response = XmlUtils.marshal(cashBatchListFilesResponse);
			logger.info("BPS|BATCH_LIST| success");
			logger.trace("BPS|BATCH_LIST --  EXIT");
			return ResponseEntity.ok(response);
			
		} catch (IOException ex) {
			throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, ex);
		}catch (JAXBException ex) {
            throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, "Response marshalling failed!", ex);
        }

		
	}

	@PostMapping(path = "getfile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<byte[]>  getFile(@RequestPart("payload") String request) {
		logger.trace("BPS|BATCH_GET| --  ENTRY");
		byte[] responseBytes = null;
		HttpHeaders headers = new HttpHeaders();
		try {
			CashBatchGetFileRequest cashBatchGetFileRequest = XmlUtils.unmarshal(request, CashBatchGetFileRequest.class);
			responseBytes= bpsService.getFileFromCdeStore(cashBatchGetFileRequest);
			String s = new String(responseBytes, StandardCharsets.UTF_8);
			int startIdx = s.indexOf("--")+2;
			int endIdx = s.indexOf('\n',startIdx);
			String boundary = s.substring(startIdx,endIdx);
			headers.add("Content-Type", "multipart/form-data; boundary="+boundary);
			logger.trace("BPS|BATCH_GET| --  EXIT");
			return new ResponseEntity<>(responseBytes,headers, HttpStatus.OK);
			
		} catch (Exception ex) {
			throw new CashIntegrationException(CashIntegrationErrorCode.CDE_INTERNAL_ERROR, ex);
		}
	}

}
