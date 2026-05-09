package com.sygnusbiotech.pharmacyerp.purchase.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PurchaseItemResponse {

    private String medicineId;
    private String batchNumber;
    private String expiryDate;
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
