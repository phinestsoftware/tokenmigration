package com.semafone.test.rogersmoneris.profile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Arrays;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.semafone.test.rogersmoneris.MockMonerisException;

@Component
public class MockDataParser {
	private static final Logger logger = LoggerFactory.getLogger(MockDataParser.class);
	
	public MockData parse(Resource resource) {
		try {
			return tryParse(resource.getInputStream());
		} catch (IOException e) {
			throw new MockMonerisException("Failed to parse mock data", e);
		}
	}

	private MockData tryParse(InputStream in) throws IOException {
		BufferedReader reader = new BufferedReader(new InputStreamReader(in));
		
		String line = reader.readLine();
		Credentials credentials = parseCredentials(line);
		MockData mockData = new MockData(credentials);
		while (( line = reader.readLine()) != null) {
			if (!isBlank(line)) {
				CardProfile cardProfile = parseCardProfile(line);
				mockData.addCardProfile(cardProfile);
			}
		}
		return mockData;
	}

	private Credentials parseCredentials(String line) {
		String[] parts = line.split(",");
		logCredentialParts(parts);
		if (parts.length != 2) {
			throw new MockMonerisException("Failed to parse credentials line - not enough parts: " + line);
		}
		return new Credentials(parts[0], parts[1]);
	}

	private void logCredentialParts(String[] parts) {
		logger.info("--------------Adding Credentials--------------");
		logger.info(""+Arrays.asList(parts));
	}
	
	private CardProfile parseCardProfile(String line) {
		String[] parts = StringUtils.delimitedListToStringArray(line, ",");
		logCardProfileParts(parts);
		if (parts.length != 4) {
			throw new MockMonerisException("Failed to parse card profile line - not enough parts: " + line);
		}
		return new CardProfile(parts[1], parts[2], parts[3], parts[0]);
	}
	
	private void logCardProfileParts(String[] parts) {
		logger.info("--------------Adding Card Profile--------------");
		logger.info(""+Arrays.asList(parts));
	}

	private boolean isBlank(String line) {
		return StringUtils.isEmpty(line);
	}
}
