package com.sygnusbiotech.pharmacyerp.inventory.controller;

import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import com.sygnusbiotech.pharmacyerp.inventory.dto.BatchRequest;
import com.sygnusbiotech.pharmacyerp.inventory.dto.BatchResponse;
import com.sygnusbiotech.pharmacyerp.inventory.service.BatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/inventory/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchService batchService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<BatchResponse>> createBatch(@Valid @RequestBody BatchRequest request) {
        BatchResponse response = batchService.createBatch(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Batch created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<BatchResponse>> updateBatch(
            @PathVariable String id, 
            @Valid @RequestBody BatchRequest request) {
        BatchResponse response = batchService.updateBatch(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Batch updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteBatch(@PathVariable String id) {
        batchService.deleteBatch(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Batch deleted successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Page<BatchResponse>>> getAllBatches(
            @RequestParam(required = false) String search,
            Pageable pageable) {
        Page<BatchResponse> records = batchService.getAllBatches(search, pageable);
        return ResponseEntity.ok(ApiResponse.success(records, "Batches retrieved successfully"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<BatchResponse>> getBatchById(@PathVariable String id) {
        BatchResponse response = batchService.getBatchById(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Batch retrieved successfully"));
    }

    @GetMapping("/medicine/{medicineId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Page<BatchResponse>>> getBatchesByMedicine(
            @PathVariable String medicineId,
            Pageable pageable) {
        Page<BatchResponse> records = batchService.getBatchesByMedicine(medicineId, pageable);
        return ResponseEntity.ok(ApiResponse.success(records, "Medicine batches retrieved successfully"));
    }

    @GetMapping("/near-expiry")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Page<BatchResponse>>> getNearExpiryBatches(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        Page<BatchResponse> records = batchService.getNearExpiryBatches(startDate, endDate, pageable);
        return ResponseEntity.ok(ApiResponse.success(records, "Near expiry batches retrieved successfully"));
    }

    @GetMapping("/expired")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Page<BatchResponse>>> getExpiredBatches(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate,
            Pageable pageable) {
        LocalDate targetDate = asOfDate != null ? asOfDate : LocalDate.now();
        Page<BatchResponse> records = batchService.getExpiredBatches(targetDate, pageable);
        return ResponseEntity.ok(ApiResponse.success(records, "Expired batches retrieved successfully"));
    }
}
