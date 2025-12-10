package com.rogers.cashintegration.bpsservice.service;

import java.io.IOException;

import org.springframework.web.multipart.MultipartFile;

import com.rogers.cashintegration.bpsservice.model.CashBatchGetFileRequest;
import com.rogers.cashintegration.bpsservice.model.CashBatchListFilesResponse;
import com.rogers.cashintegration.bpsservice.model.CashBatchPutFileRequest;
import com.rogers.cashintegration.bpsservice.model.CashBatchPutFileResponse;

import jakarta.xml.bind.JAXBException;

public interface BPSService {
	
	public CashBatchPutFileResponse processBatchPutFile(CashBatchPutFileRequest cashBatchPutFileRequestType,
			MultipartFile file) throws IOException;
	
	public CashBatchListFilesResponse listFilesFromCdeStore() throws IOException;
	

	public byte[] getFileFromCdeStore(CashBatchGetFileRequest cashBatchGetFileRequest) throws IOException, JAXBException;
}
