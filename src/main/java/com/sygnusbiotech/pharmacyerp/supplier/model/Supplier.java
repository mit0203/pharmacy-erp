package com.sygnusbiotech.pharmacyerp.supplier.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "suppliers")
public class Supplier {
    
    @Id
    private String id;
    
    @Indexed
    private String name;
    
    @Indexed
    private String phone;
    
    private String email;
    
    private String address;
    
    @Indexed
    private String gstNumber;

    // Drug License number
    private String dlNumber;

    // State and state code for GST
    private String state;
    private String stateCode;

    @Builder.Default
    private SupplierStatus status = SupplierStatus.ACTIVE;
    
    @Builder.Default
    private boolean deleted = false;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
