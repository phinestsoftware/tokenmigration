package com.semafone.test.rogersmoneris.xml;

import java.util.List;

import org.springframework.stereotype.Component;

import com.semafone.test.rogersmoneris.generated.mnresponse.ObjectFactory;
import com.semafone.test.rogersmoneris.generated.mnresponse.Receipt;
import com.semafone.test.rogersmoneris.generated.mnresponse.Response;

@Component
public class MonerisResponseFactory {
	private final ObjectFactory objectFactory = new ObjectFactory();

	private Response createResponse(Receipt receipt) {
		Response response = objectFactory.createResponse();
		response.getReceipt().add(receipt);
		return response;
	}
	
	public Response createResponse(List<Receipt> receipts) {
		Response response = objectFactory.createResponse();
		receipts.forEach(receipt->appendToResponse(response, receipt));
		return response;
	}

	private boolean appendToResponse(Response response, Receipt receipt) {
		return response.getReceipt().add(receipt);
	}

	public Receipt vaultAddSuccess(String dataKey, String cardType) {
		Receipt receipt = createSuccessReceipt(dataKey, cardType);
		return receipt;
	}

	public Receipt lookupFullSuccess(String dataKey, String cardType, String pan) {
		Receipt receipt = createSuccessReceipt(dataKey, cardType);
		receipt.setPan(pan);
		return receipt;
	}
	
	public Receipt lookupMaskedSuccess(String dataKey, String cardType, String maskedPan) {
		Receipt receipt = createSuccessReceipt(dataKey, cardType);
		receipt.setMaskedPan(maskedPan);
		return receipt;
	}
	
	public Receipt lookupMaskedVerifySuccess(String dataKey, String cardType) {
		Receipt receipt = createSuccessReceipt(dataKey, cardType);
		receipt.setMaskedPan("null");
		return receipt;
	}

	private Receipt createSuccessReceipt(String dataKey, String cardType) {
		Receipt receipt = objectFactory.createReceipt();
		receipt.setDataKey(dataKey);
		receipt.setResponseCode("100");
		receipt.setMessage("OK");
		receipt.setResponseFlag("ACCEPT");
		receipt.setCardType(cardType);
		return receipt;
	}

	// matched
	public Receipt badToken(String dataKey) {
		Receipt receipt = objectFactory.createReceipt();
		receipt.setDataKey(dataKey);
		receipt.setResponseCode("101");
		receipt.setMessage("BADTOKEN");
		receipt.setCardType("na");
		receipt.setMaskedPan("na");
		receipt.setResponseFlag("REJECT");
		return receipt;
	}
	
	public Receipt invalidNum(String cardType) {
		Receipt receipt = objectFactory.createReceipt();
		receipt.setDataKey("null");
		receipt.setResponseCode("102");
		receipt.setMessage("INVALIDNUM");
		receipt.setCardType(cardType);
		receipt.setResponseFlag("REJECT");
		return receipt;
	}
	
	public Receipt badType(String cardType) {
		Receipt receipt = objectFactory.createReceipt();
		receipt.setDataKey("null");
		receipt.setResponseCode("103");
		receipt.setMessage("BADTYPE");
		receipt.setCardType(cardType);
		receipt.setResponseFlag("REJECT");
		return receipt;
	}
	
	public Receipt typeMismatch(String cardType) {
		Receipt receipt = objectFactory.createReceipt();
		receipt.setDataKey("null");
		receipt.setResponseCode("104");
		receipt.setMessage("TYPEMISMATCH");
		receipt.setCardType(cardType);
		receipt.setResponseFlag("REJECT");
		return receipt;
	}
	
	public Receipt badBin(String cardType) {
		Receipt receipt = objectFactory.createReceipt();
		receipt.setDataKey("");
		receipt.setResponseCode("105");
		receipt.setMessage("BADBIN");
		receipt.setCardType(cardType);
		receipt.setResponseFlag("REJECT");
		return receipt;
	}

	public Receipt unknownBusinessError() {
		Receipt receipt = objectFactory.createReceipt();
		receipt.setDataKey("");
		receipt.setResponseCode("106");
		receipt.setMessage("UNKWNERROR");
		receipt.setCardType("");
		receipt.setResponseFlag("REJECT");
		return receipt;
	}

	public Receipt unknownXmlError() {
		Receipt receipt = objectFactory.createReceipt();
		receipt.setDataKey("null");
		receipt.setResponseCode("106");
		receipt.setMessage("UNKWNERROR");
		receipt.setCardType("null");
		receipt.setResponseFlag("REJECT");
		return receipt;
	}

	public Receipt noAccess(String dataKey) {
		Receipt receipt = objectFactory.createReceipt();
		if (dataKey == null) {
			receipt.setDataKey("null");
		} else {
			receipt.setDataKey(dataKey);
		}
		receipt.setResponseCode("200");
		receipt.setMessage("NOACCESS");
		receipt.setCardType("null");
		receipt.setResponseFlag("REJECT");
		return receipt;
	}
	
	public Receipt noService() {
		Receipt receipt = objectFactory.createReceipt();
		receipt.setResponseCode("201");
		receipt.setMessage("NOSERVICE");
		receipt.setResponseFlag("REJECT");
		return receipt;
	}
	
	public Receipt nullError() {
		Receipt receipt = objectFactory.createReceipt();
		receipt.setResponseCode("null");
		receipt.setMessage("null");
		receipt.setResponseFlag("REJECT");
		return receipt;
	}
	
	public Response unknownXmlErrorResponse() {
		return createResponse(unknownXmlError());
	}
}
