package com.semafone.tndispatcher.model.cs;

import lombok.Data;

import java.util.concurrent.atomic.AtomicInteger;

import static java.util.Optional.ofNullable;

@Data
public class IdAndRequest {
	public static final String SEQUENCE_PREFIX = "tnd-";
    private static final AtomicInteger sequence = new AtomicInteger();
    private static final AtomicInteger errSequence = new AtomicInteger();

    private final String messageId;
    private final CsXmlRequestModel.RequestMessage requestMessage;


    public static IdAndRequest create(CsXmlRequestModel.RequestMessage message) {
        return getIdAndRequest(message,sequence);
    }
    public static IdAndRequest createErrorId(CsXmlRequestModel.RequestMessage message) {
        return getIdAndRequest(message,sequence);
    }
    public static IdAndRequest createErrorId(String inMessageId) {
        String messageId = inMessageId == null
                ? String.format(SEQUENCE_PREFIX + "%09d",sequence.incrementAndGet())
                : inMessageId;
        return new IdAndRequest(messageId,null);
    }

    private static IdAndRequest getIdAndRequest(CsXmlRequestModel.RequestMessage message,AtomicInteger seqToUse) {
        String messageId = ofNullable(message.getSrcSystem() == null
                ? null
                : message.getSrcSystem().getMessageId()).orElseGet(()->String.format(SEQUENCE_PREFIX + "%09d",seqToUse.incrementAndGet()));
        return new IdAndRequest(messageId,message);
    }
}
