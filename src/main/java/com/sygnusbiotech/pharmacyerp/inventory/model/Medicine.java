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
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "medicines")
public class Medicine {
    @Id
    private String id;

    @Indexed(unique = false)
    private String medicineName;

    private String brandName;
    
    private String category;

    @Indexed(unique = true)
    private String sku; // Product code

    private BigDecimal unitPrice;
    
    private BigDecimal purchasePrice;

    @Builder.Default
    private Integer stockQuantity = 0;
    
    // Future expansion: Trigger low-stock alerts when quantity drops below this threshold
    @Builder.Default
    private Integer minimumStockLevel = 10;

    @Builder.Default
    private boolean isDeleted = false;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
