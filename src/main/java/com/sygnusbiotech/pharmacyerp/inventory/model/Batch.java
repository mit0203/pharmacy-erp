package com.sygnusbiotech.pharmacyerp.inventory.model;

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
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "batches")
public class Batch {
    @Id
    private String id;

    @Indexed
    private String medicineId;

    @Indexed
    private String batchNumber;

    private LocalDate manufacturingDate;

    @Indexed
    private LocalDate expiryDate;

    // The quantity available in this batch
    private Integer quantity;

    private BigDecimal purchasePrice;

    private String supplierName;

    private String invoiceReference;

    @Builder.Default
    private boolean isDeleted = false;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
