package com.semafone.test.rogersmoneris;

public class MockMonerisException extends RuntimeException {
	private static final long serialVersionUID = 1L;
	
	public MockMonerisException(String message) {
		super(message);
	}

	public MockMonerisException(String message, Throwable cause) {
		super(message, cause);
	}
}
