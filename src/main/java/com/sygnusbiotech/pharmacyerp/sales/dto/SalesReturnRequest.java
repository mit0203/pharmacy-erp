package com.sygnusbiotech.pharmacyerp.sales.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class SalesReturnRequest {

    private String reason;

    @NotEmpty(message = "At least one return item is required")
    @Valid
    private List<SalesReturnItemRequest> items;

    @Data
    public static class SalesReturnItemRequest {

        @NotBlank(message = "Medicine ID is required")
        private String medicineId;

        @Min(value = 1, message = "Return quantity must be greater than 0")
        private Integer quantity;
    }
}
