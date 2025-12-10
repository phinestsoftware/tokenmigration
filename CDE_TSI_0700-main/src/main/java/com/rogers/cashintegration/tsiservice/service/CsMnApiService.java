package com.rogers.cashintegration.tsiservice.service;

import com.rogers.cashintegration.tsiservice.exception.ErrorResultCodes;
import com.rogers.cashintegration.tsiservice.exception.InternalServerErrorException;
import com.rogers.cashintegration.tsiservice.models.SoapRequest;
import com.rogers.cashintegration.tsiservice.models.SoapResponse;
import com.rogers.cashintegration.tsiservice.service.impl.ServiceProviderImpl;
import com.rogers.cashintegration.tsiservice.utils.SoapMarshallerUtils;
import jakarta.xml.bind.JAXBException;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.URISyntaxException;

/**
 * Created by Shankar.Chakraborty on 2023-12-01
 *
 * @author : Shankar.Chakraborty
 * @date : 2023-12-01
 * @project :tsi-service
 **/

@Service
public class CsMnApiService {
    private static final Logger logger = LogManager.getLogger(CsMnApiService.class);

    private final RestTemplate restTemplate;

    @Value("${tsi.tn.host}")
    private String tnHost;

    @Value("${tsi.tn.port}")
    private String tnPORT;

    @Value("${tsi.tn.path}")
    private String tnPath;

    public CsMnApiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String callTnDispatcher(String tnRequest)  {

        try {

            URI uri = new URI("http://" + tnHost + ":" + tnPORT + "/" + tnPath);
            //String url = "http://" + tnHost + ":" + tnPORT + "/" + tnPath;

            logger.info("Call vault provider..");
            logger.debug("Call vault provider.." + "| URI: "+uri);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_XML);



            HttpEntity<String> entity = new HttpEntity<>(tnRequest, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    uri,
                    entity,
                    String.class
            );
            logger.info("Response received from vault provider..");
            logger.debug("Response received from vault provider.." + response.getBody());
            return response.getBody();
        } catch (InternalServerErrorException | URISyntaxException ex) {
            logger.error("Exception when calling vault provider.."+ex.getMessage());
            throw new InternalServerErrorException();
        }


    }


}
