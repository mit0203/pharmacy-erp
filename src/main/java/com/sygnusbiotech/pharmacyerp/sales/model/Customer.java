package com.sygnusbiotech.pharmacyerp.sales.model;

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
@Document(collection = "customers")
public class Customer {

    @Id
    private String id;

    @Indexed
    private String name;

    @Indexed
    private String phone;

    @Indexed
    private String email;

    private String address;

    @Indexed
    private String gstNumber;

    // Drug License number for pharmacy buyers
    private String dlNumber;

    // State and state code for GST
    private String state;
    private String stateCode;

    @Builder.Default
    private CustomerStatus status = CustomerStatus.ACTIVE;

    @Builder.Default
    private boolean deleted = false;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}