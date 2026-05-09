package com.sygnusbiotech.pharmacyerp.inventory.controller;

import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import com.sygnusbiotech.pharmacyerp.inventory.dto.MedicineRequest;
import com.sygnusbiotech.pharmacyerp.inventory.dto.MedicineResponse;
import com.sygnusbiotech.pharmacyerp.inventory.service.MedicineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inventory/medicines")
@RequiredArgsConstructor
public class MedicineController {

    private final MedicineService medicineService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<MedicineResponse>> createMedicine(@Valid @RequestBody MedicineRequest request) {
        MedicineResponse response = medicineService.createMedicine(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Medicine created successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Page<MedicineResponse>>> getAllMedicines(
            @RequestParam(required = false) String search,
            Pageable pageable) {
        Page<MedicineResponse> records = medicineService.getAllMedicines(search, pageable);
        return ResponseEntity.ok(ApiResponse.success(records, "Medicines retrieved successfully"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<MedicineResponse>> getMedicineById(@PathVariable String id) {
        MedicineResponse response = medicineService.getMedicineById(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Medicine retrieved successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<MedicineResponse>> updateMedicine(
            @PathVariable String id, 
            @Valid @RequestBody MedicineRequest request) {
        MedicineResponse response = medicineService.updateMedicine(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Medicine updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteMedicine(@PathVariable String id) {
        medicineService.deleteMedicine(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Medicine deleted successfully"));
    }
}
