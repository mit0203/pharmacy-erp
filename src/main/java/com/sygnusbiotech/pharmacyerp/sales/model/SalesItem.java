package com.sygnusbiotech.pharmacyerp.sales.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesItem {

    private String medicineId;
    private String medicineName;
    private String batchId;
    private String batchNumber;
    private java.time.LocalDateTime expiryDate;
    private Integer quantity;

    // Free quantity given as part of the sale
    @Builder.Default
    private Integer freeQuantity = 0;

    private BigDecimal unitPrice;

    // MRP of the product
    private BigDecimal mrp;

    // Pack / packing info (e.g. "10x10", "Strip of 10")
    private String pack;

    // HSN code for the medicine
    private String hsn;

    // Discount percentage
    @Builder.Default
    private BigDecimal discountPercent = BigDecimal.ZERO;

    // Taxable value (after discount, before GST)
    private BigDecimal taxableValue;

    // Overall GST percentage (kept for backward compatibility)
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
