package com.sygnusbiotech.pharmacyerp.sales.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SalesItemResponse {

    private String medicineId;
    private String medicineName;
    private String batchId;
    private String batchNumber;
    private java.time.LocalDateTime expiryDate;
    private Integer quantity;
    private Integer freeQuantity;
    private BigDecimal unitPrice;
    private BigDecimal mrp;
    private String pack;
    private String hsn;
    private BigDecimal discountPercent;
    private BigDecimal taxableValue;
    private BigDecimal gstPercentage;
    private BigDecimal gstAmount;
    private BigDecimal cgstPercent;
    private BigDecimal cgstAmount;
    private BigDecimal sgstPercent;
    private BigDecimal sgstAmount;
    private BigDecimal igstPercent;
    private BigDecimal igstAmount;
    private BigDecimal lineTotal;

}
