package com.sygnusbiotech.pharmacyerp.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchAllocation {
    private String batchId;
    private String batchNumber;
    private java.time.LocalDateTime expiryDate;
    private Integer allocatedQuantity;
}
