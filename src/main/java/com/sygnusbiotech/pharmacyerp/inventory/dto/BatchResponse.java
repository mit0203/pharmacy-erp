package com.sygnusbiotech.pharmacyerp.inventory.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class BatchResponse {
    private String id;
    private String medicineId;
    private String batchNumber;
    private LocalDate manufacturingDate;
    private LocalDate expiryDate;
    private Integer quantity;
    private BigDecimal purchasePrice;
    private String supplierName;
    private String invoiceReference;
    private boolean softDeletedAlert; // corresponds to isDeleted
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
