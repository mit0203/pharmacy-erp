package com.sygnusbiotech.pharmacyerp.reports.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseReportResponse {
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal totalPurchases;
    private long numberOfOrders;
    private BigDecimal averageOrderValue;
    private BigDecimal totalGstAmount;
    private BigDecimal totalAmountPaid;
    private BigDecimal totalAmountDue;
    private String topSupplierName;
    private BigDecimal topSupplierPurchases;
    private List<TrendPoint> dailyTrend;
    private List<PurchaseReportOrderItem> orders;
}
