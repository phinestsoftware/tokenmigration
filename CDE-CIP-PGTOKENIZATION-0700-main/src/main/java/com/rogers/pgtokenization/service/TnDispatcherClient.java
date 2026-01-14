package com.rogers.pgtokenization.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class TnDispatcherClient {

    @Value("${tndispatcher.base.url}")
    private String tnDispatcherUrl;

    @Autowired
    private RestTemplate restTemplate;

    /**
     * Lookup PAN from Moneris vault using data key (token)
     * Calls TNDispatcher which communicates with Moneris
     */
    public LookupResult lookupPan(String dataKey) {
        log.info("Looking up PAN for dataKey: {}", maskToken(dataKey));

        String soapRequest = buildLookupRequest(dataKey);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/soap+xml;charset=UTF-8"));

        HttpEntity<String> entity = new HttpEntity<>(soapRequest, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    tnDispatcherUrl + "/api/dispatch",
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            return parseResponse(response.getBody(), dataKey);

        } catch (Exception e) {
            log.error("Error looking up PAN for dataKey {}: {}", maskToken(dataKey), e.getMessage());
            return LookupResult.builder()
                    .success(false)
                    .dataKey(dataKey)
                    .errorCode("TN_ERROR")
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    private String buildLookupRequest(String dataKey) {
        // Build Cybersource-format SOAP request that TNDispatcher expects
        return String.format("""
                <?xml version="1.0" encoding="UTF-8"?>
                <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
                    <soap:Body>
                        <requestMessage xmlns="urn:schemas-cybersource-com:transaction-data-1.0">
                            <merchantID>rogers_merchant</merchantID>
                            <merchantReferenceCode>%s</merchantReferenceCode>
                            <paySubscriptionRetrieveService run="true">
                                <subscriptionID>%s</subscriptionID>
                            </paySubscriptionRetrieveService>
                        </requestMessage>
                    </soap:Body>
                </soap:Envelope>
                """, dataKey, dataKey);
    }

    private LookupResult parseResponse(String responseXml, String dataKey) {
        try {
            // Check for success response
            if (responseXml.contains("<reasonCode>100</reasonCode>")) {
                String pan = extractValue(responseXml, "cardAccountNumber");
                String cardType = extractValue(responseXml, "cardType");
                String expirationMonth = extractValue(responseXml, "expirationMonth");
                String expirationYear = extractValue(responseXml, "expirationYear");

                return LookupResult.builder()
                        .success(true)
                        .dataKey(dataKey)
                        .pan(pan)
                        .cardType(cardType)
                        .expiryMonth(expirationMonth)
                        .expiryYear(expirationYear)
                        .build();
            } else {
                String reasonCode = extractValue(responseXml, "reasonCode");
                String message = extractValue(responseXml, "message");

                return LookupResult.builder()
                        .success(false)
                        .dataKey(dataKey)
                        .errorCode(reasonCode != null ? reasonCode : "UNKNOWN")
                        .errorMessage(message != null ? message : "Lookup failed")
                        .build();
            }
        } catch (Exception e) {
            log.error("Error parsing TN response: {}", e.getMessage());
            return LookupResult.builder()
                    .success(false)
                    .dataKey(dataKey)
                    .errorCode("PARSE_ERROR")
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    private String extractValue(String xml, String tagName) {
        String startTag = "<" + tagName + ">";
        String endTag = "</" + tagName + ">";
        int start = xml.indexOf(startTag);
        if (start == -1) return null;
        start += startTag.length();
        int end = xml.indexOf(endTag, start);
        if (end == -1) return null;
        return xml.substring(start, end);
    }

    private String maskToken(String token) {
        if (token == null || token.length() < 8) return "****";
        return token.substring(0, 4) + "****" + token.substring(token.length() - 4);
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LookupResult {
        private boolean success;
        private String dataKey;
        private String pan;
        private String cardType;
        private String expiryMonth;
        private String expiryYear;
        private String errorCode;
        private String errorMessage;

        public String getMaskedPan() {
            if (pan == null || pan.length() < 10) return null;
            return pan.substring(0, 6) + "xxxx" + pan.substring(pan.length() - 4);
        }

        public String getFirstSix() {
            if (pan == null || pan.length() < 6) return null;
            return pan.substring(0, 6);
        }

        public String getLastFour() {
            if (pan == null || pan.length() < 4) return null;
            return pan.substring(pan.length() - 4);
        }
    }
}
