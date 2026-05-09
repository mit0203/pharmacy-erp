package com.sygnusbiotech.pharmacyerp.accounting.dto;

import com.sygnusbiotech.pharmacyerp.accounting.model.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AccountRequest {

    @NotBlank(message = "Account code is required")
    private String accountCode;

    @NotBlank(message = "Account name is required")
    private String accountName;

    @NotNull(message = "Account type is required")
    private AccountType accountType;

    private String parentAccountId;

    private BigDecimal openingBalance = BigDecimal.ZERO;

    private boolean active = true;
}
