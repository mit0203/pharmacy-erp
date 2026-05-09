package com.sygnusbiotech.pharmacyerp.sales.dto;

import com.sygnusbiotech.pharmacyerp.sales.model.PaymentStatus;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesOrderStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class SalesOrderResponse {

    private String id;
    private String orderNumber;
    private String customerId;
    private LocalDateTime orderDate;
    private SalesOrderStatus status;
    private PaymentStatus paymentStatus;
    private String invoiceNumber;
    private LocalDateTime invoiceDate;
    private LocalDateTime dueDate;
    private String lrNumber;
    private String transport;
    private String placeOfSupply;
    private boolean reverseCharge;
    private BigDecimal totalAmount;
    private BigDecimal totalGstAmount;
    private BigDecimal totalTaxableAmount;
    private BigDecimal totalCgst;
    private BigDecimal totalSgst;
    private BigDecimal totalIgst;
    private BigDecimal roundOff;
    private BigDecimal grandTotal;
    private BigDecimal amountPaid;
    private BigDecimal amountDue;
    private String notes;
    private String termsAndConditions;
    private List<SalesItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}