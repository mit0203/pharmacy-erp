package com.sygnusbiotech.pharmacyerp.accounting.controller;

import com.sygnusbiotech.pharmacyerp.accounting.dto.LedgerEntryRequest;
import com.sygnusbiotech.pharmacyerp.accounting.dto.LedgerEntryResponse;
import com.sygnusbiotech.pharmacyerp.accounting.service.LedgerEntryService;
import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ledger-entries")
@RequiredArgsConstructor
public class LedgerEntryController {

    private final LedgerEntryService ledgerEntryService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<LedgerEntryResponse>> createLedgerEntry(@Valid @RequestBody LedgerEntryRequest request) {
        LedgerEntryResponse response = ledgerEntryService.createLedgerEntry(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Ledger entry created successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Page<LedgerEntryResponse>>> getAllLedgerEntries(
            @RequestParam(required = false) String search,
            Pageable pageable) {
        Page<LedgerEntryResponse> records = ledgerEntryService.getAllLedgerEntries(search, pageable);
        return ResponseEntity.ok(ApiResponse.success(records, "Ledger entries retrieved successfully"));
    }

    @GetMapping("/account/{accountId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Page<LedgerEntryResponse>>> getLedgerEntriesByAccount(
            @PathVariable String accountId,
            Pageable pageable) {
        Page<LedgerEntryResponse> records = ledgerEntryService.getLedgerEntriesByAccount(accountId, pageable);
        return ResponseEntity.ok(ApiResponse.success(records, "Account ledger history retrieved successfully"));
    }
}
