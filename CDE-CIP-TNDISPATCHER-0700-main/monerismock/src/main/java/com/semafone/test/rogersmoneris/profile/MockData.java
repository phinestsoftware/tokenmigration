package com.semafone.test.rogersmoneris.profile;

import java.util.ArrayList;
import java.util.List;

import org.springframework.util.StringUtils;

public class MockData {
	private final Credentials credentials;
	private final List<CardProfile> cardProfiles = new ArrayList<CardProfile>();
	
	public MockData(Credentials credentials) {
		this.credentials = credentials;
	}
	
	public Credentials getCredentials() {
		return credentials;
	}

	void addCardProfile(CardProfile cardProfile) {
		assertPanNotPresent(cardProfile);
		assertTokenNotPresent(cardProfile);
		cardProfiles.add(cardProfile);
	}
	
	private void assertPanNotPresent(CardProfile cardProfile) {
		String pan = cardProfile.getPan();
		if (StringUtils.isEmpty(pan)) {
			return;
		}
		if (findByPan(pan) != null) {
			throw new IllegalArgumentException("The PAN " + pan + " already exists in this test data");
		}
	}

	private void assertTokenNotPresent(CardProfile cardProfile) {
		String token = cardProfile.getToken();
		if (StringUtils.isEmpty(token)) {
			return;
		}
		if (findByToken(token) != null) {
			throw new IllegalArgumentException("The toekn " + token + " already exists in this test data");
		}
	}

	public CardProfile findByPan(String pan) {
		return cardProfiles.stream()
				.filter(cardProfile -> pan.equals(cardProfile.getPan()))
				.findFirst()
				.orElse(null);
	}
	
	public CardProfile findByToken(String token) {
		return cardProfiles.stream()
				.filter(cardProfile -> token.equals(cardProfile.getToken()))
				.findFirst()
				.orElse(null);
	}

	public boolean hasCredentials(Credentials credentials) {
		return this.credentials.equals(credentials);
	}

}
