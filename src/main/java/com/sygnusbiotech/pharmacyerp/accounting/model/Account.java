package com.sygnusbiotech.pharmacyerp.accounting.model;

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
@Document(collection = "accounts")
public class Account {

    @Id
    private String id;

    @Indexed(unique = true)
    private String accountCode;

    private String accountName;

    private AccountType accountType;

    private String parentAccountId;

    @Builder.Default
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private boolean isDeleted = false;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
