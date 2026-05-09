package com.sygnusbiotech.pharmacyerp.purchase.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class PurchaseOrderRequest {

    @NotBlank(message = "Supplier ID is required")
    private String supplierId;

    private String notes;

    // Optional invoice-specific fields
    private String supplierInvoiceNumber;
    private LocalDateTime dueDate;
    private String lrNumber;
    private String transport;
    private String placeOfSupply;
    private boolean reverseCharge;
    private String termsAndConditions;

    @NotEmpty(message = "Purchase order must contain at least one item")
    @Valid
    private List<PurchaseItemRequest> items;
}
