package com.sygnusbiotech.pharmacyerp.purchase.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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

    private String expiryDate;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be greater than 0")
    private Integer quantity;

    @Min(value = 0, message = "Free quantity cannot be negative")
    private Integer freeQuantity;

    @NotNull(message = "Unit Price is required")
    @DecimalMin(value = "0.01", message = "Unit price must be greater than 0")
    private BigDecimal unitPrice;

    @DecimalMin(value = "0.00", message = "MRP cannot be negative")
    private BigDecimal mrp;

    private String pack;

    private String hsn;

    @DecimalMin(value = "0.00", message = "Discount percentage cannot be negative")
    @DecimalMax(value = "100.00", message = "Discount percentage cannot be greater than 100")
    private BigDecimal discountPercent;

    @NotNull(message = "GST Percentage is required")
    @DecimalMin(value = "0.00", message = "GST percentage cannot be negative")
    @DecimalMax(value = "100.00", message = "GST percentage cannot be greater than 100")
    private BigDecimal gstPercentage;
}
