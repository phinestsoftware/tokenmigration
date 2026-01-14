package com.rogers.mastercardmock.profile;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
@Slf4j
public class MockData {

    private final Map<String, CardProfile> panToProfile = new ConcurrentHashMap<>();
    private final Map<String, CardProfile> tokenToProfile = new ConcurrentHashMap<>();
    private final AtomicLong tokenCounter = new AtomicLong(9700000000000000L);

    @PostConstruct
    public void init() {
        // Add some default test cards
        addTestCard("5123456789012346", "9703796509383554", "MASTERCARD", "CREDIT", "SUCCESS");
        addTestCard("4111111111111111", "9704111111111111", "VISA", "CREDIT", "SUCCESS");
        addTestCard("378282246310005", "9703782822463100", "AMEX", "CREDIT", "SUCCESS");
        addTestCard("6011111111111117", "9706011111111117", "DISCOVER", "CREDIT", "SUCCESS");

        // Add error test cards
        addErrorCard("4000000000000002", "INVALID_CARD", "Card number is invalid");
        addErrorCard("5000000000000009", "EXPIRED_CARD", "Card has expired");
        addErrorCard("4000000000000069", "DECLINED", "Card was declined");

        log.info("MockData initialized with {} test cards", panToProfile.size());
    }

    private void addTestCard(String pan, String token, String brand, String funding, String response) {
        CardProfile profile = CardProfile.builder()
                .pan(pan)
                .token(token)
                .cardBrand(brand)
                .fundingMethod(funding)
                .responseCode(response)
                .build();
        panToProfile.put(pan, profile);
        tokenToProfile.put(token, profile);
    }

    private void addErrorCard(String pan, String errorCause, String errorExplanation) {
        CardProfile profile = CardProfile.builder()
                .pan(pan)
                .responseCode("ERROR")
                .errorCause(errorCause)
                .errorExplanation(errorExplanation)
                .build();
        panToProfile.put(pan, profile);
    }

    /**
     * Find card profile by PAN
     */
    public CardProfile findByPan(String pan) {
        return panToProfile.get(pan);
    }

    /**
     * Find card profile by token
     */
    public CardProfile findByToken(String token) {
        return tokenToProfile.get(token);
    }

    /**
     * Generate a new token for a PAN (simulates tokenization)
     * If the PAN exists in test data, return its predefined token.
     * Otherwise, generate a new token.
     */
    public CardProfile tokenize(String pan) {
        // Check if PAN has predefined profile
        CardProfile existing = panToProfile.get(pan);
        if (existing != null) {
            return existing;
        }

        // Generate new token for unknown PAN
        String newToken = String.valueOf(tokenCounter.incrementAndGet());
        String brand = CardProfile.detectCardBrand(pan);

        CardProfile newProfile = CardProfile.builder()
                .pan(pan)
                .token(newToken)
                .cardBrand(brand)
                .fundingMethod("CREDIT")
                .responseCode("SUCCESS")
                .build();

        panToProfile.put(pan, newProfile);
        tokenToProfile.put(newToken, newProfile);

        log.debug("Generated new token {} for PAN {}", newToken, maskPan(pan));
        return newProfile;
    }

    private String maskPan(String pan) {
        if (pan == null || pan.length() < 10) return "****";
        return pan.substring(0, 6) + "****" + pan.substring(pan.length() - 4);
    }
}
