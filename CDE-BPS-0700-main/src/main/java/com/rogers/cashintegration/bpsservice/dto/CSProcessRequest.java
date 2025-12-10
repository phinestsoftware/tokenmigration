package com.rogers.cashintegration.bpsservice.dto;


import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.Data;

import java.util.List;

/**
 * @author: Shankar.Chakraborty
 * @project: cs-process
 */
@Data
@XmlRootElement(name = "CSProcessRequest")
@XmlAccessorType(XmlAccessType.FIELD)
public class CSProcessRequest {

    @XmlElement(name = "TokenPanEntry")
    private List<TokenPanEntry> tokenPanEntryList;

}

