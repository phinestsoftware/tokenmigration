package com.semafone.tndispatcher.model;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import com.semafone.tndispatcher.model.cs.CsOperation;
import com.semafone.tndispatcher.model.cs.CsRequest;
import com.semafone.tndispatcher.model.cs.IdAndRequest;
import com.semafone.tndispatcher.model.mn.*;
import com.semafone.tndispatcher.model.mn.MnXmlResponseModel.ResponseOperationResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static com.google.common.base.Preconditions.checkArgument;
import static com.google.common.base.Preconditions.checkState;
import static com.semafone.tndispatcher.model.mn.MnReceiptProperties.asSet;

/**
 * Maps Monerix XML response body to MnResponse <br/>
 * Copies request messageId to MnResponse receipts <br/>
 * Validates response is logically coherent with request sent <br/>
 * - basic validation or reqired response properties based on requested operation <br/><br/>
 * Assumes that request/response sequence is the same
 */
@Component
@Slf4j
public class MnXmlResponseParser {
    public MnResponse parseResponse(CsRequest csRequest, MnXmlResponseModel.MnXmlResponseBody mnXmlResponse) {
        List<MnOperationResult> results = Lists.newArrayList();
        final Iterator<CsOperation> csOperationIt = csRequest.getCsOperations().iterator();


        for (ResponseOperationResult receipt : mnXmlResponse.getReceipt()) {
            CsOperation csOp = null;
            try {
                csOp = csOperationIt.next();
                VaultOperation vaultOp = csOp.getVaultOperation();
                validateResponsePropertiesPresent(vaultOp, receipt, MnReceiptProperties.getRequiredProperties(vaultOp),MnReceiptProperties.getOptionalProps(vaultOp));
                results.add(createMnResult(csOp, receipt));
            } catch (IllegalArgumentException e) {
                throw new MnResponseParseException(csOp, e);
            }
        }
        return new MnResponse(results);
    }

    /**
     * Checks that required properties are present (not null)
     * Check that not required properties are absent (null)
     *
     * @param requiredProps - properties returned in response to check against vaultOp
     */
    private void validateResponsePropertiesPresent(VaultOperation vaultOp, ResponseOperationResult receipt,
                                                   Set<MnReceiptProperties> requiredProps, Set<MnReceiptProperties> optionalProps) {
        checkArgument(!isNullOrLiteralNull(receipt.getResponseCode()), MnResponseRequiredFields.RESPONSE_CODE.name() + " is missing");
        checkArgument(!isNullOrLiteralNull(receipt.getMessage()), MnResponseRequiredFields.MESSAGE.name() + " is missing");

        ResponseStatus responseStatus = ResponseStatus.fromCode(Integer.valueOf(receipt.getResponseCode()));

        if (responseStatus == ResponseStatus.OK) {
            List<MnReceiptProperties> missingProperties = requiredProps.stream()
                                                                       .filter(rP -> isNullOrLiteralNull(receipt.getProperty(rP)))
                                                                       .collect(Collectors.toList());
            if (!missingProperties.isEmpty()) { // lazy error generation
                checkState(missingProperties.isEmpty(), "Invalid response for operation [%s]. Required properties are missing: %s",
                        vaultOp, Arrays.toString(missingProperties.toArray()));
            }
            List<MnReceiptProperties> unexpectedProps = Sets.difference(asSet(), requiredProps).stream()
                                                            .filter(p -> !isNullOrLiteralNull(receipt.getProperty(p)))
                                                            .collect(Collectors.toList());
            List<MnReceiptProperties> disallowedProps = Lists.newArrayList(Sets.difference(Sets.newHashSet(unexpectedProps), optionalProps));
            if (!disallowedProps.isEmpty()) {
                checkState(disallowedProps.isEmpty(), "Invalid response for operation [%s]. Unexpected properties found in response: %s",
                        vaultOp, Arrays.toString(unexpectedProps.toArray()));
            }
        }
    }

    private boolean isNullOrLiteralNull(String property) {
        return property == null || "null".equals(property);
    }

    private MnOperationResult createMnResult(CsOperation csOp, ResponseOperationResult receipt) {
        VaultOperation vaultOp = csOp.getVaultOperation();
        final IdAndRequest idAndRequest = csOp.getIdAndRequest();
        final ResponseStatus responseStatus = ResponseStatus.fromCode(Integer.valueOf(receipt.getResponseCode()));
        final MnCardType cardType = MnCardType.typeOrNull(receipt.getCardType());
        switch (vaultOp) {
            case TOKENIZE:
                return new MnOperationResult.MnTokenizeOperationResult(idAndRequest, responseStatus, cardType, receipt.getToken());
            case DETOKENIZE:
                return new MnOperationResult.MnLookupFullOperationResult(idAndRequest, responseStatus, cardType, receipt.getAccountNumber());
            case FIRSTSIX:
                return new MnOperationResult.MnLookupMaskedOperationResult(idAndRequest, responseStatus, MnLookupType.FIRST6, cardType, receipt.getMaskedAccountNumber(), null);
            case VERIFY:
                CsOperation.CsVerifyOperation csV = (CsOperation.CsVerifyOperation) csOp;
                return new MnOperationResult.MnLookupMaskedOperationResult(idAndRequest, responseStatus, MnLookupType.VERIFY, cardType, null, csV.getToken());
            default:
                throw new IllegalArgumentException("Invalid vaultOp: " + vaultOp.name());
        }
    }
}
