package com.sygnusbiotech.pharmacyerp.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class MedicineRequest {

    @NotBlank(message = "Medicine Name is required")
    private String medicineName;

    @NotBlank(message = "Brand Name is required")
    private String brandName;

    private String category;

    @NotBlank(message = "SKU is required")
    private String sku;

    @NotNull(message = "Unit Price is required")
    @Min(value = 0, message = "Unit Price cannot be negative")
    private BigDecimal unitPrice;

    @NotNull(message = "Purchase Price is required")
    @Min(value = 0, message = "Purchase Price cannot be negative")
    private BigDecimal purchasePrice;

    @Min(value = 0, message = "Minimum Stock Level cannot be negative")
    private Integer minimumStockLevel;
}
