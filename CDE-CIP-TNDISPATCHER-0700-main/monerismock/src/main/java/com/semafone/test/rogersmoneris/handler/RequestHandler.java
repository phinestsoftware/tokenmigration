package com.semafone.test.rogersmoneris.handler;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.semafone.test.rogersmoneris.generated.mnrequest.Request;
import com.semafone.test.rogersmoneris.generated.mnrequest.ResAddCc;
import com.semafone.test.rogersmoneris.generated.mnrequest.ResLookupFull;
import com.semafone.test.rogersmoneris.generated.mnrequest.ResLookupMasked;
import com.semafone.test.rogersmoneris.generated.mnresponse.Receipt;
import com.semafone.test.rogersmoneris.generated.mnresponse.Response;
import com.semafone.test.rogersmoneris.profile.CardProfile;
import com.semafone.test.rogersmoneris.profile.MockData;
import com.semafone.test.rogersmoneris.xml.MonerisResponseFactory;

@Component
public class RequestHandler {
	@Autowired
	private MockData mockData;
	
	@Autowired
	private MonerisResponseFactory responseFactory;

	public Response handelRequest(Request request) {
		List<Object> resItems = getResItems(request);
		List<Receipt> receipts = processResItems(resItems);
		return responseFactory.createResponse(receipts);
	}

	private List<Object> getResItems(Request request) {
		List<Object> resItemsUnfiltered = extractResItems(request);
		List<Object> resItemsFiltered = removeNulls(resItemsUnfiltered);
		return resItemsFiltered;
	}

	private List<Object> removeNulls(List<Object> resItemsUnfiltered) {
		return resItemsUnfiltered.stream()
				.filter(resItem -> resItem != null)
				.collect(Collectors.toList());
	}

	private List<Object> extractResItems(Request request) {
		List<Object> resItems = new ArrayList<Object>();
		resItems.add(request.getResAddCc());
		resItems.add(request.getResLookupFull());
		resItems.add(request.getResLookupMasked());
		
		if (request.getResBatch() != null) {
			resItems.addAll(request.getResBatch().getResAddCcOrResLookupFullOrResLookupMasked());
		}
		return resItems;
	}

	private List<Receipt> processResItems(List<Object> resItems) {
		List<Receipt> receipts = new ArrayList<>();
		resItems.forEach(resItem -> {
			Receipt receipt = processResItem(resItem);
			receipts.add(receipt);
		});
		return receipts;
	}

	private Receipt processResItem(Object resItem) {
		if (resItem instanceof ResAddCc) {
			return processResAddCc((ResAddCc)resItem);
		}
		if (resItem instanceof ResLookupFull) {
			return processResLookupFull((ResLookupFull)resItem);
		}
		if (resItem instanceof ResLookupMasked) {
			return processResLookupMasked((ResLookupMasked)resItem);
		}
		throw new IllegalArgumentException("Unexpected res item type: " + resItem.getClass().getName());
	}

	private Receipt processResAddCc(ResAddCc resItem) {
		CardProfile cardProfile = getCardProfileByPanOrThrow(resItem.getPan());
		assertCardTypesMatch(cardProfile, resItem);
		
		if (requiresErrorResponse(cardProfile)) {
			return generateErrorResponse(cardProfile, resItem.getCardType(), null);
		}
		
		return responseFactory.vaultAddSuccess(cardProfile.getToken(), cardProfile.getCardType());
	}

	private void assertCardTypesMatch(CardProfile cardProfile, ResAddCc resItem) {
		if (!cardProfile.getCardType().equals(resItem.getCardType())) {
			throw new IllegalArgumentException("Card type in request " + resItem.getCardType() + " doesn't match test data: " + cardProfile);
		}
	}

	private boolean requiresErrorResponse(CardProfile cardProfile) {
		return !"100".equals(cardProfile.getResponseCode());
	}

	private CardProfile getCardProfileByPanOrThrow(String pan) {
		CardProfile cardProfile = mockData.findByPan(pan);
		if (cardProfile == null) {
			throw new IllegalArgumentException("PAN not present in test data: " + pan);
		}
		return cardProfile;
	}

	private CardProfile getCardProfileByTokenOrThrow(MockData mockData, String token) {
		CardProfile cardProfile = mockData.findByToken(token);
		if (cardProfile == null) {
			throw new IllegalArgumentException("Token not present in test data: " + token);
		}
		return cardProfile;
	}
	
	private Receipt generateErrorResponse(CardProfile cardProfile, String cardType, String dataKey) {
		String responseCode = cardProfile.getResponseCode();
		switch (responseCode) {
		case "101":
			return responseFactory.badToken(dataKey);
		case "102":
			return responseFactory.invalidNum(cardType);
		case "103":
			return responseFactory.badType(cardType);
		case "104":
			return responseFactory.typeMismatch(cardType);
		case "105":
			return responseFactory.badBin(cardType);
		case "106a":
			return responseFactory.unknownBusinessError();
		case "106b":
			return responseFactory.unknownXmlError();
		case "200":
			return responseFactory.noAccess(dataKey);
		case "201":
			return responseFactory.noService();
		case "x1":
			sleep(35000);
			return responseFactory.noService();
		case "null":
			return responseFactory.nullError();
		}
		throw new IllegalArgumentException("Unsupported error response code: " + responseCode);
	}

	private void sleep(int millis) {
		try {
			Thread.sleep(millis);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

	private Receipt processResLookupFull(ResLookupFull resItem) {
		CardProfile cardProfile = getCardProfileByTokenOrThrow(mockData, resItem.getDataKey());
		
		if (requiresErrorResponse(cardProfile)) {
			return generateErrorResponse(cardProfile, null, resItem.getDataKey());
		}
		
		return responseFactory.lookupFullSuccess(cardProfile.getToken(), cardProfile.getCardType(), cardProfile.getPan());
	}

	private Receipt processResLookupMasked(ResLookupMasked resItem) {
		CardProfile cardProfile = getCardProfileByTokenOrThrow(mockData, resItem.getDataKey());
		
		if (requiresErrorResponse(cardProfile)) {
			return generateErrorResponse(cardProfile, null, resItem.getDataKey());
		}
		
		String lookupFormat = resItem.getLookupFormat();
		if ("3".equals(lookupFormat)) {
			return processResLookupMaskedFirstSix(cardProfile, resItem);
		}
		if ("4".equals(lookupFormat)) {
			return processResLookupVerify(cardProfile, resItem);
		}
		throw new UnsupportedOperationException("Unsupported vault lookup masked format: " + lookupFormat);
	}

	private Receipt processResLookupMaskedFirstSix(CardProfile cardProfile, ResLookupMasked resItem) {
		String maskedPan = cardProfile.getPan().substring(0, 6);
		return responseFactory.lookupMaskedSuccess(cardProfile.getToken(), cardProfile.getCardType(), maskedPan);
	}

	private Receipt processResLookupVerify(CardProfile cardProfile, ResLookupMasked resItem) {
		return responseFactory.lookupMaskedVerifySuccess(cardProfile.getToken(), cardProfile.getCardType());
	}
}
