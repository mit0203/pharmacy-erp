package com.sygnusbiotech.pharmacyerp.sales.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class SalesOrderRequest {

    @NotBlank(message = "Customer ID is required")
    private String customerId;

    private String notes;

    // Optional invoice-specific fields
    private LocalDateTime dueDate;
    private String lrNumber;
    private String transport;
    private String placeOfSupply;
    private boolean reverseCharge;
    private String termsAndConditions;

    @NotEmpty(message = "Sales order must contain at least one item")
    @Valid
    private List<SalesItemRequest> items;
}
