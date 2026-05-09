package com.sygnusbiotech.pharmacyerp.accounting.dto;

import com.sygnusbiotech.pharmacyerp.accounting.model.AccountType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class AccountResponse {

    private String id;
    private String accountCode;
    private String accountName;
    private AccountType accountType;
    private String parentAccountId;
    private BigDecimal openingBalance;
    private BigDecimal currentBalance;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
