package com.rogers.cashintegration.tsiservice.service.impl;

import com.rogers.cashintegration.tsiservice.exception.ErrorResultCodes;
import com.rogers.cashintegration.tsiservice.exception.InternalServerErrorException;
import com.rogers.cashintegration.tsiservice.models.SoapRequest;
import com.rogers.cashintegration.tsiservice.models.SoapResponse;
import com.rogers.cashintegration.tsiservice.service.CsMnApiService;
import com.rogers.cashintegration.tsiservice.service.ServiceProvider;
import com.rogers.cashintegration.tsiservice.utils.SoapMarshallerUtils;
import jakarta.xml.bind.JAXBException;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URISyntaxException;


/**
 * Created by Shankar.Chakraborty on 2023-12-01
 *
 * @author : Shankar.Chakraborty
 * @date : 2023-12-01
 * @project :tsi-service
 **/

@Service
public class ServiceProviderImpl implements ServiceProvider {

    private static final Logger logger = LogManager.getLogger(ServiceProviderImpl.class);

    private  final CsMnApiService csMnApiService;

    @Autowired
    public ServiceProviderImpl(CsMnApiService csMnApiService) {
        this.csMnApiService = csMnApiService;
    }


    @Override
    public String processRequest(String soapRequestXml){

        try {
            return csMnApiService.callTnDispatcher(soapRequestXml);
        }catch (InternalServerErrorException ex) {
            // Handling internal server error and returning an error response
            logger.error("Exception when calling vault provider.."+ex.getMessage());
            throw new InternalServerErrorException();
        }

    }

    private String prepareDummyResponseData() throws JAXBException {
        SoapResponse soapResponse = new SoapResponse();
        SoapResponse.Body body = new SoapResponse.Body();
        SoapResponse.Body.ResponseMessages responseMessages = new SoapResponse.Body.ResponseMessages();
        SoapResponse.Body.ResponseMessages.ResponseMessage responseMessage = new SoapResponse.Body.ResponseMessages.ResponseMessage();
        SoapResponse.Body.ResponseMessages.ResponseMessage.SrcSystem srcSystem = new SoapResponse.Body.ResponseMessages.ResponseMessage.SrcSystem();
        SoapResponse.Body.ResponseMessages.ResponseMessage.Vault vault = new SoapResponse.Body.ResponseMessages.ResponseMessage.Vault();
        SoapResponse.Body.ResponseMessages.ResponseMessage.Rm rm = new SoapResponse.Body.ResponseMessages.ResponseMessage.Rm();
        SoapResponse.Body.ResponseMessages.ResponseMessage.CcTokenizeService ccTokenizeService = new SoapResponse.Body.ResponseMessages.ResponseMessage.CcTokenizeService();

        rm.setRflag("ACCEPT");
        rm.setRmsg("OK");
        vault.setToken("5834738483247284");
        srcSystem.setName("cmeadTest");
        srcSystem.setSysIndicator("69346");
        srcSystem.setMessageId("hello");
        responseMessage.setSrcSystem(srcSystem);
        responseMessage.setVault(vault);
        responseMessage.setRm(rm);
        responseMessage.setReasonCode("100");
        responseMessage.setCcTokenizeService(ccTokenizeService);
        responseMessages.getResponseMessage().add(responseMessage);
        body.setResponseMessages(responseMessages);
        soapResponse.setBody(body);
        return SoapMarshallerUtils.marshalSoapResponse(soapResponse);
    }
}
