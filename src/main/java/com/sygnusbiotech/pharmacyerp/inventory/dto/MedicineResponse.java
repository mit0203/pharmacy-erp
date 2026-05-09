package com.sygnusbiotech.pharmacyerp.inventory.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class MedicineResponse {
    private String id;
    private String medicineName;
    private String brandName;
    private String category;
    private String sku;
    private BigDecimal unitPrice;
    private BigDecimal purchasePrice;
    private Integer stockQuantity;
    private Integer minimumStockLevel;
    private boolean softDeletedAlert; // Maps to isDeleted but re-named visually
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
