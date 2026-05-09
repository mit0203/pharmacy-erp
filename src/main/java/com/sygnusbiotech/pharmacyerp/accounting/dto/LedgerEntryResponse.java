package com.sygnusbiotech.pharmacyerp.accounting.dto;

import com.sygnusbiotech.pharmacyerp.accounting.model.EntryType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class LedgerEntryResponse {

    private String id;
    private LocalDateTime transactionDate;
    private String referenceType;
    private String referenceId;
    private String description;
    private String debitAccountId;
    private String debitAccountName;
    private String creditAccountId;
    private String creditAccountName;
    private BigDecimal amount;
    private EntryType entryType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
