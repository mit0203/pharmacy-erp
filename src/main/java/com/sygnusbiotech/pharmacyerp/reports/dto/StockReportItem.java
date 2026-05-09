package com.sygnusbiotech.pharmacyerp.reports.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockReportItem {
    private String medicineId;
    private String medicineName;
    private String sku;
    private String category;
    private String brandName;
    private Integer stockQuantity;
    private Integer minimumStockLevel;
    private BigDecimal unitPrice;
    private BigDecimal purchasePrice;
    private BigDecimal stockValue;
    private boolean lowStock;
}
