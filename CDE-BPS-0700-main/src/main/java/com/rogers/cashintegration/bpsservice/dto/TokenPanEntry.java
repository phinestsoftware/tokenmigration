package com.rogers.cashintegration.bpsservice.dto;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.UUID;

/**
 * TokenPanEntry represents an entry containing tokenized or PAN (Primary Account Number) data.
 * <p>
 * - The class includes properties for various card-related information.
 * - It provides constructors for different scenarios, initializing relevant properties.
 * - The unique message ID is generated for each instance using UUID.
 * <p>
 *
 * @author: Shankar.Chakraborty
 * @project: cs-process
 */


@Getter
@Setter
@ToString
@NoArgsConstructor
@XmlRootElement(name = "TokenPanEntry")
@XmlAccessorType(XmlAccessType.FIELD)
public class TokenPanEntry {

    // Unique message id
    @XmlElement
    private String messageId;
    @XmlElement
    private String token;
    @XmlElement
    private String pan;
    @XmlElement
    private String expirationDate;
    @XmlElement
    private String expirationMonth;
    @XmlElement
    private String expirationYear;
    @XmlElement
    private String cvc;
    @XmlElement
    private String cardType;
    @XmlElement
    private String csReasonFlag;
    @XmlElement
    private String csReasonMsg;
    @XmlElement
    private String csReasonCode;
    @XmlElement
    private String transactionId;
    @XmlElement
    private int lineNumber = -1;


    public TokenPanEntry(String token) {
        this.token = token;
        this.messageId = generateUniqueMessageId();
    }

    public TokenPanEntry(String token, int lineNumber) {
        this.token = token;
        this.lineNumber = lineNumber;
        this.messageId = generateUniqueMessageId();
    }

    public TokenPanEntry(String pan, String cardType, int lineNumber) {
        this.pan = pan;
        this.cardType = cardType;
        this.lineNumber = lineNumber;
        this.messageId = generateUniqueMessageId();
    }


    public TokenPanEntry(String pan, String cardType, String expirationMonth, String expirationYear, int lineNumber) {
        this(pan, cardType, lineNumber);

        this.expirationMonth = expirationMonth;
        this.expirationYear = expirationYear;
    }

    public TokenPanEntry(String pan, String cardType, String expiryDate, String cvc, String transactionId, int lineNumber) {
        this(pan, cardType, lineNumber);

        this.expirationDate = expiryDate;
        if (expiryDate != null && expiryDate.trim().length() == 4) {
            this.expirationMonth = expiryDate.substring(0, 2);
            this.expirationYear = expiryDate.substring(2);
        }
        if (expiryDate != null && expiryDate.trim().length() == 5) {
            this.expirationMonth = expiryDate.substring(0, 2);
            this.expirationYear = expiryDate.substring(3);
        }
        this.cvc = cvc;
        this.transactionId = transactionId;
    }

    public String getCsResponseFlagAndMessage() {
        //csErrRespFlag and csErrRespMsg will always be non-null
        return getCsReasonFlag() + ":" + getCsReasonMsg();
    }


    private String generateUniqueMessageId() {
        return UUID.randomUUID().toString();
    }
}
