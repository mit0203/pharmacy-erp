package com.sygnusbiotech.pharmacyerp.supplier.controller;

import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import com.sygnusbiotech.pharmacyerp.supplier.dto.SupplierRequest;
import com.sygnusbiotech.pharmacyerp.supplier.dto.SupplierResponse;
import com.sygnusbiotech.pharmacyerp.supplier.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<SupplierResponse>> createSupplier(
            @Valid @RequestBody SupplierRequest request) {
        SupplierResponse response = supplierService.createSupplier(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Supplier created successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Page<SupplierResponse>>> getAllSuppliers(
            @RequestParam(required = false) String search,
            Pageable pageable) {
        Page<SupplierResponse> records = supplierService.getAllSuppliers(search, pageable);
        return ResponseEntity.ok(ApiResponse.success(records, "Suppliers retrieved successfully"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<SupplierResponse>> getSupplierById(@PathVariable String id) {
        SupplierResponse response = supplierService.getSupplierById(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Supplier retrieved successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<SupplierResponse>> updateSupplier(
            @PathVariable String id,
            @Valid @RequestBody SupplierRequest request) {
        SupplierResponse response = supplierService.updateSupplier(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Supplier updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(@PathVariable String id) {
        supplierService.deleteSupplier(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Supplier deleted successfully"));
    }
}