package com.rogers.cashintegration.bpsservice.model;

import java.io.Serializable;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import jakarta.xml.bind.annotation.XmlType;
import lombok.Data;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(name = "", propOrder = { "fileName", "fileProcessId", "formatId" })
@XmlRootElement(name = "cashBatchPutFileRequest")
@Data
public class CashBatchPutFileRequest implements Serializable {
	
	private final static long serialVersionUID = 1L;
	@XmlElement(required = true)
	private String fileName;
	@XmlElement(required = true)
	private String fileProcessId;
	private String formatId;

}
