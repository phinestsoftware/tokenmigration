package com.semafone.tndispatcher.service;

import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.google.common.collect.ImmutableList;
import com.semafone.tndispatcher.config.SerializationConfig.XmlMapperProvider;
import com.semafone.tndispatcher.http.RequestContext;
import com.semafone.tndispatcher.http.service.HttpService;
import com.semafone.tndispatcher.model.*;
import com.semafone.tndispatcher.model.cs.CsRequest;
import com.semafone.tndispatcher.model.cs.CsResponse;
import com.semafone.tndispatcher.model.mn.MnRequest;
import com.semafone.tndispatcher.model.mn.MnResponse;
import com.semafone.tndispatcher.model.mn.MnXmlResponseModel.MnXmlResponseBody;
import com.semafone.tndispatcher.model.mn.MnXmlResponseModel.ResponseOperationResult;
import com.semafone.tndispatcher.utils.XsdValidation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.xml.sax.SAXException;

import java.io.IOException;
import java.util.List;

@Component
@Slf4j
public class TnMonerisRequestDispatcher extends TnRequestDispatcher {

    private final String url;
    private final CsXmlModelParser csXmlModelParser;
    private final MnXmlModelFactory mnXmlModelFactory;
    private final MnXmlResponseParser mnXmlResponseParser;
    private final CsXmlModelFactory csXmlModelFactory;
    private final XsdValidation csRequestValidator;
    private final XsdValidation mnResponseValidator;
    private final XmlMapper xmlMapper;

    @Autowired
    public TnMonerisRequestDispatcher(
            @Value("${semafone.endpoints.moneris}") String url,
            HttpService httpService,
            CsXmlModelParser csXmlModelParser,
            MnXmlResponseParser mnXmlResponseParser,
            MnXmlModelFactory mnXmlModelFactory,
            CsXmlModelFactory csXmlModelFactory,
            XmlMapperProvider xmlMapperProvider,
            @Qualifier(value = "csRequestValidator") XsdValidation csRequestValidator,
            @Qualifier(value = "mnResponseValidator") XsdValidation mnResponseValidator
    ) {
        super(httpService);
        this.url = url;

        this.csXmlModelParser = csXmlModelParser;
        this.mnXmlModelFactory = mnXmlModelFactory;
        this.csXmlModelFactory = csXmlModelFactory;
        this.mnXmlResponseParser = mnXmlResponseParser;
        this.csRequestValidator = csRequestValidator;
        this.mnResponseValidator = mnResponseValidator;
        this.xmlMapper = xmlMapperProvider.getXmlMapper();
    }

    @Override
    public void dispatch(RequestContext context) {
        try {
            validateCsRequest(context);

            //map cs request to mn request
            final CsRequest csRequest = csXmlModelParser.parseRequest(context.getRequestInputStream());
            final MnRequest mnRequest = CsToMnRequestMapper.mapRequest(csRequest);
            String xmlBody = mnXmlModelFactory.createRequestXml(mnRequest);
            //exchange with Moneris vault
            String body = getHttpService().executePost(url, xmlBody, String.class);

            
            validateMnResponse(body);

            final MnXmlResponseBody mnXmlResponse = xmlMapper.readValue(body, MnXmlResponseBody.class);
            logResponseCodes(mnXmlResponse);
            //map mn response to cs
            MnResponse mnResponse = mnXmlResponseParser.parseResponse(csRequest, mnXmlResponse);
            setResponseBody(context, mnResponse);
        } catch (CsRequestParseException csParseException) {
            if (csParseException.isBusinessError()) {
                MnResponse errorResponse = new MnResponse(ImmutableList.of(csParseException.asMnOperationResult()));
                setResponseBody(context, errorResponse);
            } else {
                throw new SoapFaultCsException(csParseException);
            }
        } catch (MnResponseParseException mnRespE) {
            if (mnRespE.isBusinessError()) {
                MnResponse errorResponse = new MnResponse(ImmutableList.of(mnRespE.asMnOperationResult()));
                setResponseBody(context, errorResponse);
            } else {
                throw new SoapFaultCsException(mnRespE);
            }
        } catch (IOException e) {
            log.error("IOException while dispatching", e);
            throw new SoapFaultCsException(e.getMessage());
        }

    }

    private void logResponseCodes(final MnXmlResponseBody mnXmlResponse) {
        if(log.isInfoEnabled() && (mnXmlResponse !=null) && (mnXmlResponse.getReceipt() != null)){
            
            log.info("Response Code: " + getResponseCodes(mnXmlResponse.getReceipt()));
        }
    }

    private void validateMnResponse(String body) {
        try {
            mnResponseValidator.validate(body);
        } catch (SAXException e) {
            throw new SoapFaultMnException(e.getMessage());
        }
    }

    private void validateCsRequest(RequestContext context) {
        try {
            csRequestValidator.validate(context.getRequestBodyAsString());
        } catch (SAXException e) {
            throw new SoapFaultCsException(e.getMessage());
        }
    }


    private void setResponseBody(RequestContext context, MnResponse mnResponse) {
        final CsResponse csResponse = MnToCsResponseMapper.mapResponse(mnResponse);
        context.setResponseBody(csXmlModelFactory.createResponseModel(csResponse));
    }
    
    private String getResponseCodes(List<ResponseOperationResult> result) {
        StringBuilder sb = new StringBuilder();
        for (ResponseOperationResult responseOperationResult : result) {
               sb.append(responseOperationResult.responseCode);
               sb.append(",");
        }
        return sb.toString();
    }
}
