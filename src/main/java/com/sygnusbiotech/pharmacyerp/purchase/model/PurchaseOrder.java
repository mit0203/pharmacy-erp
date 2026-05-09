package com.sygnusbiotech.pharmacyerp.purchase.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "purchase_orders")
public class PurchaseOrder {

    @Id
    private String id;

    @Indexed(unique = true)
    private String orderNumber;

    @Indexed
    private String supplierId;

    private LocalDateTime orderDate;

    @Builder.Default
    private PurchaseOrderStatus status = PurchaseOrderStatus.DRAFT;

    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Indexed
    private String invoiceNumber;
    
    private String supplierInvoiceNumber;

    private LocalDateTime invoiceDate;

    private LocalDateTime dueDate;

    // Transport / logistics
    private String lrNumber;
    private String transport;
    private String placeOfSupply;

    @Builder.Default
    private boolean reverseCharge = false;

    private String notes;

    private BigDecimal totalAmount;

    private BigDecimal totalGstAmount;

    // Detailed tax breakdowns
    private BigDecimal totalTaxableAmount;
    private BigDecimal totalCgst;
    private BigDecimal totalSgst;
    private BigDecimal totalIgst;
    private BigDecimal roundOff;
    private BigDecimal grandTotal;

    @Builder.Default
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal amountDue = BigDecimal.ZERO;

    private String termsAndConditions;

    private List<PurchaseItem> items;

    @Builder.Default
    private boolean isDeleted = false;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}