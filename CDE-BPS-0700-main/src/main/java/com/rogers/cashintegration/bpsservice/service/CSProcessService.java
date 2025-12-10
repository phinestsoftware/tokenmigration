package com.rogers.cashintegration.bpsservice.service;

import java.io.IOException;
import java.util.List;

import com.rogers.cashintegration.bpsservice.dto.CSProcessRequest;
import com.rogers.cashintegration.bpsservice.dto.CSProcessResponse;
import com.rogers.cashintegration.bpsservice.model.CashBatchPutFileRequest;
import com.rogers.cashintegration.bpsservice.dto.TokenPanEntry;

public interface CSProcessService {

	public CSProcessResponse callCSDeTokenizeService(CSProcessRequest csProcessRequest);

	public byte[] performDetokanization(CashBatchPutFileRequest cashBatchPutFileRequestType, List<TokenPanEntry> tokenPanEntryList, String attachmentStr, String fileName) throws IOException;
}
