package com.semafone.tndispatcher.model.cs;

import com.semafone.tndispatcher.model.CsRequestRequiredFields;
import org.assertj.core.util.Strings;

public enum CsCardType {
    V,M,A, D,
    N, na; //unknown

    public static CsCardType parseString(String cardType) {
        if(Strings.isNullOrEmpty(cardType)){
            throw new IllegalArgumentException("Empty cardType");
        }
        for (CsCardType type: values()) {
            if(cardType.equals(type.name())) {
                return type;
            }
        }
        throw new IllegalArgumentException(CsRequestRequiredFields.CARD_TYPE.name() + " invalid. Value provided: " + cardType);
    }
}
