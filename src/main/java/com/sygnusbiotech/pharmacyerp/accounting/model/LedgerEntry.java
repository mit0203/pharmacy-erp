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
@Document(collection = "ledger_entries")
public class LedgerEntry {

    @Id
    private String id;

    private LocalDateTime transactionDate;

    private String referenceType;

    private String referenceId;

    private String description;

    @Indexed
    private String debitAccountId;

    @Indexed
    private String creditAccountId;

    private BigDecimal amount;

    private EntryType entryType;

    @Builder.Default
    private boolean isDeleted = false;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
