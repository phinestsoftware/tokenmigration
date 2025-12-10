package com.rogers.cashintegration.tsiservice.service;

import com.rogers.cashintegration.tsiservice.models.SoapRequest;
import com.rogers.cashintegration.tsiservice.models.SoapResponse;
import jakarta.xml.bind.JAXBException;

/**
 * Created by Shankar.Chakraborty on 2023-12-01
 *
 * @author : Shankar.Chakraborty
 * @date : 2023-12-01
 * @project :tsi-service
 **/


public interface ServiceProvider {
    public String processRequest(String soapRequestXml) throws JAXBException;
}
