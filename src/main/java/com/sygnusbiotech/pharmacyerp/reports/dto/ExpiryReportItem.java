package com.sygnusbiotech.pharmacyerp.reports.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpiryReportItem {
    private String batchId;
    private String medicineId;
    private String medicineName;
    private String batchNumber;
    private LocalDate expiryDate;
    private Integer quantity;
    private String supplierName;
    private Long daysToExpiry;
    private String statusLabel;
}
