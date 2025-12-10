package com.semafone.tndispatcher.model;

import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.google.common.base.Throwables;
import com.google.common.collect.Lists;
import com.semafone.tndispatcher.config.SerializationConfig;
import com.semafone.tndispatcher.model.cs.*;
import com.semafone.tndispatcher.model.cs.CsXmlRequestModel.*;
import lombok.extern.slf4j.Slf4j;
import org.assertj.core.util.Strings;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import static com.google.common.base.Preconditions.checkArgument;
import static com.google.common.base.Preconditions.checkNotNull;
import static com.semafone.tndispatcher.constants.Constants.MISSING;
import static java.util.Optional.ofNullable;

@Slf4j
@Component
public class CsXmlModelParser {

    private final XmlMapper xmlMapper;

    @Autowired
    public CsXmlModelParser(SerializationConfig.XmlMapperProvider xmlMapperProvider) {
        this.xmlMapper = xmlMapperProvider.getXmlMapper();
    }

    public CsRequest parseRequest(InputStream requestBodyStream) {
        try {
            RequestEnvelope xmlRequestRoot = xmlMapper.readValue(requestBodyStream, RequestEnvelope.class);
            return mapFromXmlModel(xmlRequestRoot);
        } catch (IOException e) {
            throw Throwables.propagate(e);
        } finally {
            try {
                requestBodyStream.close();
            } catch (IOException e) {
            	log.debug("Unexpected IOException while closing the requestBodyStream - ignored", e);
            }
        }
    }

    private CsRequest mapFromXmlModel(RequestEnvelope xmlRequestRoot) {
        RequestEnvelope requestEnvelope = xmlRequestRoot;
        CsCredentials csCredentials = getCsCredentials(checkNotNull(requestEnvelope.getHeader()));
        List<CsOperation> csOperations = getCsOperations(checkNotNull(requestEnvelope.getRequestBody()));
        return new CsRequest(csCredentials, csOperations);

    }

    private CsCredentials getCsCredentials(RequestHeader header) {
         final Security security = checkNotNull(header.getSecurity());
        final UsernameToken usernameToken = checkNotNull(security.getUsernameToken());
        return new CsCredentials(usernameToken.getWsuId(),
                usernameToken.getUserName(), usernameToken.getPassword());
    }

    private List<CsOperation> getCsOperations(RequestBody body) {
        final RequestMessages messages = checkNotNull(body.getRequestMessages());
        List<CsOperation> csOperations = Lists.newArrayList();
        List<RequestMessage> rm = messages.getRequestMessages();

        for (RequestMessage msg : rm) {
            try {
                csOperations.add(mapToCsOperation(msg));
            } catch (IllegalArgumentException e) {
                throw new CsRequestParseException(msg,e);
            }
        }
        return csOperations;
    }

    private CsOperation mapToCsOperation(RequestMessage msg) {
        Card card = ofNullable(msg.getCard()).orElseGet(Card::new);

        IdAndRequest idAndRequest = IdAndRequest.create(msg);

        CsServiceIndicator serviceIndicator = new CsServiceIndicator(msg);
        serviceIndicator.checkHasSingleService();

        if (serviceIndicator.isTokenize()) {
            checkArgument(!Strings.isNullOrEmpty(card.getAccountNumber()), CsRequestRequiredFields.PAN.name() + MISSING);
            checkArgument(!Strings.isNullOrEmpty(card.getCardType()), CsRequestRequiredFields.CARD_TYPE.name() + MISSING);
            checkArgument(Strings.isNullOrEmpty(card.getToken()), CsRequestRequiredFields.TOKEN.name() + " not allowed");

            return new CsOperation.CsTokenizeOperation(idAndRequest,
                    CsCardType.parseString(card.getCardType()),
                    card.getAccountNumber(),
                    card.getExpirationMonth(), card.getExpirationYear(),
                    Boolean.TRUE.equals(msg.getCcTokenizeService().getRun()));
        }
        if (serviceIndicator.isDeTokenize() || serviceIndicator.isFirstSix() || serviceIndicator.isVerify()) {
            checkArgument(Strings.isNullOrEmpty(card.getAccountNumber()), CsRequestRequiredFields.PAN.name() + " not allowed");
            checkArgument(!Strings.isNullOrEmpty(card.getToken()), CsRequestRequiredFields.TOKEN.name() + MISSING);
            if (serviceIndicator.isDeTokenize()) {
                return new CsOperation.CsDetokenizeOperation(idAndRequest, card.getToken(),
                        Boolean.TRUE.equals(msg.getCcDeTokenizeService().getRun()));
            }
            if (serviceIndicator.isFirstSix()) {
                return new CsOperation.CsFirst6Operation(idAndRequest, card.getToken(),
                        Boolean.TRUE.equals(msg.getCcFirstSixService().getRun()));
            }
            if (serviceIndicator.isVerify()) {
                return new CsOperation.CsVerifyOperation(idAndRequest, card.getToken(),
                        Boolean.TRUE.equals(msg.getCcVerifyService().getRun()));
            }
        }
        throw new IllegalArgumentException(String.format("Invalid requestMessage: [%s]", msg.toString()));

    }

	private static class CsServiceIndicator {
		private RequestMessage msg;

		private CsServiceIndicator(RequestMessage msg) {
			this.msg = msg;
		}

		private boolean isTokenize() {
			return msg.getCcTokenizeService() != null  && msg.getCcTokenizeService().getRun();
		}
		private boolean isDeTokenize() {
			return msg.getCcDeTokenizeService() != null  && msg.getCcDeTokenizeService().getRun();
		}
		private boolean isFirstSix() {
			return msg.getCcFirstSixService() != null  && msg.getCcFirstSixService().getRun();
		}
		private boolean isVerify() {
			return msg.getCcVerifyService() != null  && msg.getCcVerifyService().getRun();
		}

		private void checkHasSingleService() {
	        int noOpsNamed = (isTokenize() ? 11 : 0)
	                         + (isDeTokenize() ? 101 : 0)
	                         + (isFirstSix() ? 1001 : 0)
	                         + (isVerify() ? 10001 : 0);
	        checkArgument(noOpsNamed % 10 == 1, "OPERATION [%s] is invalid. Single feature allowed.", String.valueOf(noOpsNamed));
	    }
	}


}