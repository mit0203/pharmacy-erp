package com.sygnusbiotech.pharmacyerp.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BatchRequest {

    @NotBlank(message = "Medicine ID is required")
    private String medicineId;

    @NotBlank(message = "Batch Number is required")
    private String batchNumber;

    @NotNull(message = "Manufacturing Date is required")
    private LocalDate manufacturingDate;

    @NotNull(message = "Expiry Date is required")
    private LocalDate expiryDate;

    @NotNull(message = "Quantity is required")
    @Min(value = 0, message = "Quantity cannot be negative")
    private Integer quantity;

    @NotNull(message = "Purchase Price is required")
    @Min(value = 0, message = "Purchase Price cannot be negative")
    private BigDecimal purchasePrice;

    private String supplierName;

    private String invoiceReference;
}
