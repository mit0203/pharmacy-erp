package com.sygnusbiotech.pharmacyerp.purchase.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseItem {

    private String medicineId;
    private String batchNumber;
    private String expiryDate;
    private Integer quantity;

    // Free quantity given by supplier
    @Builder.Default
    private Integer freeQuantity = 0;

    private BigDecimal unitPrice;

    // MRP of the product
    private BigDecimal mrp;

    // Pack info
    private String pack;

    // HSN code
    private String hsn;

    // Discount percentage
    @Builder.Default
    private BigDecimal discountPercent = BigDecimal.ZERO;

    // Taxable value (after discount, before GST)
    private BigDecimal taxableValue;

    // Overall GST percentage (backward compatible)
    private BigDecimal gstPercentage;
    private BigDecimal gstAmount;

    // Split GST components
    private BigDecimal cgstPercent;
    private BigDecimal cgstAmount;
    private BigDecimal sgstPercent;
    private BigDecimal sgstAmount;
    private BigDecimal igstPercent;
    private BigDecimal igstAmount;

    private BigDecimal lineTotal;

}
