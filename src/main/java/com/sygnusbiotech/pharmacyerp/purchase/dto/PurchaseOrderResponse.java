package com.sygnusbiotech.pharmacyerp.purchase.dto;

import com.sygnusbiotech.pharmacyerp.purchase.model.PaymentStatus;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrderStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PurchaseOrderResponse {

    private String id;
    private String orderNumber;
    private String supplierId;
    private LocalDateTime orderDate;
    private PurchaseOrderStatus status;
    private PaymentStatus paymentStatus;
    private String invoiceNumber;
    private String supplierInvoiceNumber;
    private LocalDateTime invoiceDate;
    private LocalDateTime dueDate;
    private String lrNumber;
    private String transport;
    private String placeOfSupply;
    private boolean reverseCharge;
    private String notes;
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
    private String termsAndConditions;
    private List<PurchaseItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}