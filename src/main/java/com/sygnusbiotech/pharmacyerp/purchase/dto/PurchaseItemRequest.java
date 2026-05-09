package com.sygnusbiotech.pharmacyerp.purchase.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PurchaseItemRequest {

    @NotBlank(message = "Medicine ID is required")
    private String medicineId;

    private String batchNumber;

    private String expiryDate; // ISO formatted string or just MM/yyyy or dd/MM/yyyy

    @NotNull(message = "Quantity is required")
    @Min(value = 0, message = "Quantity must be greater than or equal to 0")
    private Integer quantity;

    // Optional: free quantity
    private Integer freeQuantity;

    @NotNull(message = "Unit Price is required")
    @Min(value = 0, message = "Unit Price must be greater than or equal to 0")
    private BigDecimal unitPrice;

    // Optional: MRP
    private BigDecimal mrp;

    // Optional: Pack info
    private String pack;

    // Optional: HSN code
    private String hsn;

    // Optional: discount percentage
    private BigDecimal discountPercent;

    @NotNull(message = "GST Percentage is required")
    @Min(value = 0, message = "GST Percentage must be greater than or equal to 0")
    private BigDecimal gstPercentage;
}
