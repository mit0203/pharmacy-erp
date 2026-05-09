package com.sygnusbiotech.pharmacyerp.accounting.dto;

import com.sygnusbiotech.pharmacyerp.accounting.model.EntryType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class LedgerEntryRequest {

    @NotNull(message = "Transaction date is required")
    private LocalDateTime transactionDate;

    private String referenceType;

    private String referenceId;

    private String description;

    @NotBlank(message = "Debit account ID is required")
    private String debitAccountId;

    @NotBlank(message = "Credit account ID is required")
    private String creditAccountId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotNull(message = "Entry type is required")
    private EntryType entryType;
}
