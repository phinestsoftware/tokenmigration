package com.semafone.tndispatcher.http.controller;

import com.semafone.tndispatcher.constants.Constants;
import com.semafone.tndispatcher.http.RequestContext;
import com.semafone.tndispatcher.http.RequestResolver;
import com.semafone.tndispatcher.model.SoapFaultCsException;
import com.semafone.tndispatcher.model.SoapFaultMnException;
import com.semafone.tndispatcher.service.TnRequestDispatcherProvider;
import com.semafone.tndispatcher.utils.FileUtils;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiResponse;
import io.swagger.annotations.ApiResponses;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping(Constants.DISPATCH_CONTROLLER_API)
public class DispatcherController {

    private static final String CS_OUTBOUND_SOAP_FAULT = "cs outbound soap fault.";
    @Autowired
    private TnRequestDispatcherProvider dispatcherProvider;

    @ApiOperation(value = "dispatchRequest", nickname = "dispatchRequest")
    @ApiResponses(value = {
            @ApiResponse(code = 200, message = "Success"),
            @ApiResponse(code = 500, message = "Failure")})
    @RequestMapping(value = {Constants.DISPATCH_CONTROLLER_DISPATCH},
            method = {RequestMethod.GET,
                    RequestMethod.POST})
    public void dispatchRequest(
            HttpServletRequest httpServletRequest,
            HttpServletResponse httpServletResponse) throws IOException {
        httpServletResponse.setContentType("application/soap+xml;charset=ISO-8859-1");

        RequestContext requestContext = RequestResolver.resolve(httpServletRequest);
        try {
            MDC.put("tndRequestId", UUID.randomUUID().toString());

            log.debug("cs inbound request"+requestContext.getRequestBodyAsString());

            dispatcherProvider.getDispatcher().dispatch(requestContext);

            // Cybersource response mirroring
            if (requestContext.isHttpPost()) {
                httpServletResponse.setStatus(HttpServletResponse.SC_OK);
            }

            log.debug("cs outbound response"+requestContext.getResponseBody());
            httpServletResponse.getWriter().write(requestContext.getResponseBody());

        } catch (SoapFaultCsException csException) {
            String soapFault = createClientSoapFault(csException.getMessage());
            log.info(CS_OUTBOUND_SOAP_FAULT + csException);

            httpServletResponse.getWriter().write(soapFault);

        } catch (SoapFaultMnException mnException) {
            String soapFault = createReceiverSoapFault(mnException.getMessage());
            log.info(CS_OUTBOUND_SOAP_FAULT + mnException);
            httpServletResponse.getWriter().write(soapFault);

        } catch (Exception ex2) {
            log.error("Unexpected exception:", ex2);
            String soapFault = createClientSoapFault(ex2.getMessage());
            log.info(CS_OUTBOUND_SOAP_FAULT);
            httpServletResponse.getWriter().write(soapFault);

        } finally {
            MDC.clear();
        }
    }

    private String createClientSoapFault(String message) throws IOException {
        String fileContentAsString = FileUtils.getFileContentAsString("soapFault-Client.xml");
        return fileContentAsString.replace("${message}",message);
    }

    private String createReceiverSoapFault(String message) throws IOException {
        String fileContentAsString = FileUtils.getFileContentAsString("soapFault-Receiver.xml");
        return fileContentAsString.replace("${message}",message);
    }
}

