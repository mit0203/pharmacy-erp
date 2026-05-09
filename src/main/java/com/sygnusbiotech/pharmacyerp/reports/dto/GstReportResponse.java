package com.sygnusbiotech.pharmacyerp.reports.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GstReportResponse {
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal totalSalesTaxableAmount;
    private BigDecimal totalPurchaseTaxableAmount;
    private BigDecimal totalSalesGST;
    private BigDecimal totalPurchaseGST;
    private BigDecimal netGstPayable;
}
