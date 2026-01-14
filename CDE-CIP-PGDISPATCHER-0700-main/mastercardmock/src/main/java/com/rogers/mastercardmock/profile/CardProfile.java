package com.rogers.mastercardmock.profile;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CardProfile {

    private String pan;
    private String token;
    private String cardBrand;
    private String fundingMethod;
    private String responseCode;
    private String errorCause;
    private String errorExplanation;

    /**
     * Get masked PAN (first 6, last 4)
     */
    public String getMaskedPan() {
        if (pan == null || pan.length() < 10) {
            return pan;
        }
        return pan.substring(0, 6) + "xxxx" + pan.substring(pan.length() - 4);
    }

    /**
     * Determine card brand from PAN
     */
    public static String detectCardBrand(String pan) {
        if (pan == null || pan.isEmpty()) {
            return "UNKNOWN";
        }
        char firstDigit = pan.charAt(0);
        switch (firstDigit) {
            case '4':
                return "VISA";
            case '5':
                return "MASTERCARD";
            case '3':
                if (pan.startsWith("34") || pan.startsWith("37")) {
                    return "AMEX";
                }
                return "OTHER";
            case '6':
                return "DISCOVER";
            default:
                return "OTHER";
        }
    }
}
