package com.sygnusbiotech.pharmacyerp.sales.controller;

import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import com.sygnusbiotech.pharmacyerp.sales.dto.CustomerRequest;
import com.sygnusbiotech.pharmacyerp.sales.dto.CustomerResponse;
import com.sygnusbiotech.pharmacyerp.sales.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> createCustomer(
            @Valid @RequestBody CustomerRequest request) {
        CustomerResponse response = customerService.createCustomer(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Customer created successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Page<CustomerResponse>>> getAllCustomers(
            @RequestParam(required = false) String search,
            Pageable pageable) {
        Page<CustomerResponse> records = customerService.getAllCustomers(search, pageable);
        return ResponseEntity.ok(ApiResponse.success(records, "Customers retrieved successfully"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomerById(@PathVariable String id) {
        CustomerResponse response = customerService.getCustomerById(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Customer retrieved successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> updateCustomer(
            @PathVariable String id,
            @Valid @RequestBody CustomerRequest request) {
        CustomerResponse response = customerService.updateCustomer(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Customer updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteCustomer(@PathVariable String id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Customer deleted successfully"));
    }
}