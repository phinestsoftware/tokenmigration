package com.rogers.cashintegration.tsiservice.controller;

import com.rogers.cashintegration.tsiservice.constants.Constants;
import com.rogers.cashintegration.tsiservice.exception.InternalServerErrorException;
import com.rogers.cashintegration.tsiservice.exception.ResourceNotFoundException;
import com.rogers.cashintegration.tsiservice.service.ServiceProvider;
import jakarta.xml.bind.JAXBException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;


/**
 * Created by Shankar.Chakraborty on 2023-12-01
 *
 * @author : Shankar.Chakraborty
 * @date : 2023-12-01
 * @project :tsi-service
 **/

@Slf4j
@RestController
public class RequestController {

    private final ServiceProvider serviceProvider;

    @Autowired
    public RequestController(ServiceProvider serviceProvider) {
        this.serviceProvider = serviceProvider;
    }

    @PostMapping(
            value = Constants.DISPATCH_CONTROLLER_API + Constants.DISPATCH_CONTROLLER_DISPATCH,
            consumes = MediaType.APPLICATION_XML_VALUE,
            produces = MediaType.APPLICATION_XML_VALUE
    )
    public ResponseEntity<String> processSoapRequest(@RequestBody String soapRequestXml) {


        try {
            String soapResponseXml = serviceProvider.processRequest(soapRequestXml);
            return ResponseEntity.ok(soapResponseXml);
        } catch (InternalServerErrorException | JAXBException ex) {
            // Handling internal server error and returning an error response
            throw new InternalServerErrorException();
        }

    }

    @PostMapping("/**") // Handle all paths
    public ResponseEntity<String> handleNotFound() {
        throw new ResourceNotFoundException();
    }

}
