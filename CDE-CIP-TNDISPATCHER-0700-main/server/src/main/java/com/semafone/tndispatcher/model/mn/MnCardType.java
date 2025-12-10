package com.semafone.tndispatcher.model.mn;


import com.google.common.collect.EnumBiMap;
import com.semafone.tndispatcher.model.cs.CsCardType;
import lombok.Getter;
import org.assertj.core.util.Strings;

public enum MnCardType {
    V(CsCardType.V), M(CsCardType.M), A(CsCardType.A), D(CsCardType.D),N(CsCardType.N),na(CsCardType.na);

    @Getter
    private final CsCardType csType;

    private static final EnumBiMap<MnCardType, CsCardType> mnToCsMap;
    static {
        EnumBiMap<MnCardType, CsCardType> mnToCs = EnumBiMap.create(MnCardType.class, CsCardType.class);
        for(MnCardType mn:values()){
            mnToCs.put(mn, mn.csType);
        }
        mnToCsMap = mnToCs;
    }

    MnCardType(CsCardType csCardType) {
        this.csType = csCardType;
    }

    public static MnCardType fromCsCardType(CsCardType cardType) {
        if(!mnToCsMap.inverse().containsKey(cardType)) {
                throw new EnumConstantNotPresentException(MnCardType.class, cardType.name());
        }
        return mnToCsMap.inverse().get(cardType);
    }

    public static MnCardType typeOrNull(String cardType) {
        if("null".equals(cardType) || MnCardType.na.toString().equals(cardType) || Strings.isNullOrEmpty(cardType)) {
            return na;
        }
        return valueOf(cardType);
    }
    public static CsCardType csTypeOrNull(MnCardType mnCardType) {
        if(mnCardType == null) {
            return null;
        }
        return mnCardType.getCsType();
    }
}
