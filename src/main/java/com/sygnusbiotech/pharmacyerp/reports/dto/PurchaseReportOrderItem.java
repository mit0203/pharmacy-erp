package com.sygnusbiotech.pharmacyerp.reports.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseReportOrderItem {
    private String orderId;
    private String orderNumber;
    private String invoiceNumber;
    private LocalDateTime orderDate;
    private String supplierId;
    private String supplierName;
    private String status;
    private String paymentStatus;
    private BigDecimal totalAmount;
    private BigDecimal totalGstAmount;
    private BigDecimal amountPaid;
    private BigDecimal amountDue;
    private Integer itemCount;
}
