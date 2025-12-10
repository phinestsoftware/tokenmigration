package com.rogers.cce.creditoption.controllers;

import com.rogers.cce.creditoption.exceptions.interfaces.NotEmptyMandatoryFields;
import com.rogers.cce.creditoption.exceptions.interfaces.ValidSize;
import com.rogers.cce.creditoption.models.CreditOptionsResponse;
import com.rogers.cce.creditoption.services.CreditOptionsService;
import com.rogers.cce.creditoption.util.CryptoUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.*;
import java.util.Base64;
import java.util.concurrent.CompletionStage;

import static com.rogers.cce.creditoption.constants.StringConstants.GET_CREDIT_OPTIONS_LOG;

@RestController
@RestControllerAdvice
@Validated
public class CreditOptionsController {

    private static final Logger logger = LoggerFactory.getLogger(CreditOptionsController.class);

    @Autowired
    CreditOptionsService creditOptionsService;

    @Autowired
    private CryptoUtil cryptoUtil;

    @Operation(description = "Get the last credit Options")
    @Validated({NotEmptyMandatoryFields.class, ValidSize.class})
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Credit check results", content = {@Content(mediaType = "application/json", schema = @Schema(implementation = CreditOptionsResponse.class))}),
            @ApiResponse(responseCode = "400", description = "Bad request", content = {@Content(mediaType = "application/json", schema = @Schema(implementation = com.rogers.cce.creditoption.models.CreditOptionsResponse.class))}),
            @ApiResponse(responseCode = "422", description = "Business Error", content = {@Content(mediaType = "application/json", schema = @Schema(implementation = com.rogers.cce.creditoption.models.CreditOptionsResponse.class))}),
            @ApiResponse(responseCode = "401", description = "Unauthorized User", content = {@Content(mediaType = "application/json", schema = @Schema(implementation = com.rogers.cce.creditoption.models.CreditOptionsResponse.class))}),
            @ApiResponse(responseCode = "500", description = "Internal Server Error", content = {@Content(mediaType = "application/json", schema = @Schema(implementation = CreditOptionsResponse.class))})})
    @RequestMapping(value = "/v1/local_data/account/{accountAlias}/creditoptions", method = RequestMethod.GET)
    public CompletionStage<CreditOptionsResponse> getCreditOptions(
            @PathVariable("accountAlias") String accountAlias,
            @RequestHeader(value = "cce-Subscription-Key") String cceSubscriptionKey,
            @RequestParam(required = false) @Size(min = 0, max = 4, groups = ValidSize.class) @NotEmpty(groups = NotEmptyMandatoryFields.class) String riskClass,
            @RequestParam(required = false) @Size(min = 0, max = 4, groups = ValidSize.class) @NotEmpty(groups = NotEmptyMandatoryFields.class) String creditOption,
            @RequestParam(required = false) @Size(min = 0, max = 20, groups = ValidSize.class) @NotEmpty(groups = NotEmptyMandatoryFields.class) String applicationID,
            @RequestParam(required = false) @Valid @NotNull(groups = NotEmptyMandatoryFields.class) @Min(value = 0, groups = ValidSize.class) @Max(value = 9999, groups = ValidSize.class) Integer totalDupCTN,
            @RequestParam(required = false) @Size(min = 0, max = 1, groups = ValidSize.class) String creditClass,
            @RequestParam(required = false) @Size(min = 0, max = 36, groups = ValidSize.class) String transactionID
    ) throws Exception {
        logger.info(GET_CREDIT_OPTIONS_LOG + " START");
        byte[] encAccByte = Base64.getDecoder().decode(accountAlias);

        byte[] decryptedInString = cryptoUtil.decrypt(encAccByte);
        int decryptedAcc = Integer.valueOf(new String(decryptedInString));
        logger.info("After decryption "+decryptedAcc);

        return creditOptionsService.getCreditOptions(decryptedAcc, riskClass, creditOption, applicationID, creditClass, transactionID, totalDupCTN);

    }


}


