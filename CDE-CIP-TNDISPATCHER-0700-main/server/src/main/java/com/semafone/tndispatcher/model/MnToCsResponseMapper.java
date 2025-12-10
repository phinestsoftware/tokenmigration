package com.semafone.tndispatcher.model;

import com.google.common.collect.Lists;
import com.semafone.tndispatcher.model.cs.CsOperationResult;
import com.semafone.tndispatcher.model.cs.CsOperationResult.CsDetokenizeOperationResult;
import com.semafone.tndispatcher.model.cs.CsOperationResult.CsTokenizeOperationResult;
import com.semafone.tndispatcher.model.cs.CsResponse;
import com.semafone.tndispatcher.model.mn.MnCardType;
import com.semafone.tndispatcher.model.mn.MnOperationResult;
import com.semafone.tndispatcher.model.mn.MnResponse;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

@Slf4j
public class MnToCsResponseMapper {
    private final List<CsOperationResult> csResults = Lists.newArrayList();

    public static CsResponse mapResponse(MnResponse mnResponse) {
        MnToCsResponseMapper mapper = new MnToCsResponseMapper();
        for (MnOperationResult receipt : mnResponse.getMnOperationResults()) {
            receipt.apply(mapper);
        }

        return new CsResponse(mapper.csResults);
    }

    public void visit(MnOperationResult.MnTokenizeOperationResult mnT) {
        CsTokenizeOperationResult result = new CsTokenizeOperationResult(mnT.getCsIdAndRequest(), mnT.getToken(), mnT.getResponseStatus());
        log.info("Tokenization-Token"+mnT.getToken());
        csResults.add(result);
    }

    public void visit(MnOperationResult.MnLookupFullOperationResult mnD) {
        CsDetokenizeOperationResult result = new CsDetokenizeOperationResult(mnD.getCsIdAndRequest(),
                MnCardType.csTypeOrNull(mnD.getCardType()), mnD.getPan(), mnD.getResponseStatus());
        csResults.add(result);
    }

    public void visit(MnOperationResult.MnLookupMaskedOperationResult mnD) {
        CsOperationResult result;

        switch (mnD.getVaultOperation()) {
            case FIRSTSIX:
                result = new CsOperationResult.CsFirst6OperationResult(mnD.getCsIdAndRequest(),
                        MnCardType.csTypeOrNull(mnD.getCardType()), mnD.getPartialPan(), mnD.getResponseStatus());
                break;
            case VERIFY:
                result = new CsOperationResult.CsVerifyOperationResult(mnD.getCsIdAndRequest(),
                        MnCardType.csTypeOrNull(mnD.getCardType()), mnD.getResponseStatus(), mnD.getToken());
                log.info("VERIFY-Token"+mnD.getToken());
                break;
            default:
                throw new IllegalStateException("Unexpected result to map: " + mnD.getVaultOperation().name());
        }
        csResults.add(result);
    }
}
