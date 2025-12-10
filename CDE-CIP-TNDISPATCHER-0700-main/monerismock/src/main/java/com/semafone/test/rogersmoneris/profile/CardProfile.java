package com.semafone.test.rogersmoneris.profile;

public class CardProfile {
	private final String pan;
	private final String token;
	private final String cardType;
	private final String responseCode;

	public CardProfile(String pan, String token, String cardType, String responseCode) {
		this.pan = pan;
		this.token = token;
		this.cardType = cardType;
		this.responseCode = responseCode;
	}
	
	public String getPan() {
		return pan;
	}
	
	public String getToken() {
		return token;
	}
	
	public String getCardType() {
		return cardType;
	}
	
	public String getResponseCode() {
		return responseCode;
	}

	@Override
	public String toString() {
		return "CardProfile [pan=" + pan + ", token=" + token + ", cardType=" + cardType + ", responseCode=" + responseCode + "]";
	}
}
