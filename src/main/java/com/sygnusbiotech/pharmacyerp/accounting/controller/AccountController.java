package com.sygnusbiotech.pharmacyerp.accounting.controller;

import com.sygnusbiotech.pharmacyerp.accounting.dto.AccountRequest;
import com.sygnusbiotech.pharmacyerp.accounting.dto.AccountResponse;
import com.sygnusbiotech.pharmacyerp.accounting.service.AccountService;
import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<AccountResponse>> createAccount(@Valid @RequestBody AccountRequest request) {
        AccountResponse response = accountService.createAccount(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Account created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<AccountResponse>> updateAccount(
            @PathVariable String id,
            @Valid @RequestBody AccountRequest request) {
        AccountResponse response = accountService.updateAccount(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Account updated successfully"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<AccountResponse>> getAccountById(@PathVariable String id) {
        AccountResponse response = accountService.getAccountById(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Account retrieved successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Page<AccountResponse>>> getAllAccounts(
            @RequestParam(required = false) String search,
            Pageable pageable) {
        Page<AccountResponse> records = accountService.getAllAccounts(search, pageable);
        return ResponseEntity.ok(ApiResponse.success(records, "Accounts retrieved successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> softDeleteAccount(@PathVariable String id) {
        accountService.softDeleteAccount(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Account deleted successfully"));
    }

    @GetMapping("/{id}/balance")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<BigDecimal>> getAccountBalance(@PathVariable String id) {
        BigDecimal balance = accountService.getAccountBalance(id);
        return ResponseEntity.ok(ApiResponse.success(balance, "Account balance retrieved successfully"));
    }
}
