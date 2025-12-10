package com.rogers.cashintegration.bpsservice.service;

import java.io.File;
import java.io.IOException;

import org.springframework.web.multipart.MultipartFile;

import com.rogers.cashintegration.bpsservice.model.CashBatchPutFileRequest;


public interface BpsFileProcessService {

	public void processFileforBatchPut(String attachmentStr, CashBatchPutFileRequest cashBatchPutFileRequestType, MultipartFile file, String batchId) throws IOException;
	
	public void renameFileAfterBatchGet(File attachmentFile, String oldFileSuffix) throws IOException;
}
