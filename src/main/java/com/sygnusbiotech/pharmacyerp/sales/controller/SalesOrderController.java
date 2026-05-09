package com.sygnusbiotech.pharmacyerp.sales.controller;

import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import com.sygnusbiotech.pharmacyerp.sales.dto.SalesOrderRequest;
import com.sygnusbiotech.pharmacyerp.sales.dto.SalesOrderResponse;
import com.sygnusbiotech.pharmacyerp.sales.dto.SalesPaymentUpdateRequest;
import com.sygnusbiotech.pharmacyerp.sales.dto.SalesReturnRequest;
import com.sygnusbiotech.pharmacyerp.sales.service.SalesOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SalesOrderController {

    private final SalesOrderService salesOrderService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> createSalesOrder(@Valid @RequestBody SalesOrderRequest request) {
        SalesOrderResponse response = salesOrderService.createSalesOrder(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Sales order created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> updateSalesOrder(
            @PathVariable String id,
            @Valid @RequestBody SalesOrderRequest request) {
        SalesOrderResponse response = salesOrderService.updateSalesOrder(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Sales order updated successfully"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> getSalesOrderById(@PathVariable String id) {
        SalesOrderResponse response = salesOrderService.getSalesOrderById(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Sales order retrieved successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Page<SalesOrderResponse>>> getAllSalesOrders(
            @RequestParam(required = false) String search,
            Pageable pageable) {
        Page<SalesOrderResponse> records = salesOrderService.getAllSalesOrders(search, pageable);
        return ResponseEntity.ok(ApiResponse.success(records, "Sales orders retrieved successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteSalesOrder(@PathVariable String id) {
        salesOrderService.deleteSalesOrder(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Sales order deleted successfully"));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> confirmSalesOrder(@PathVariable String id) {
        SalesOrderResponse response = salesOrderService.confirmSalesOrder(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Sales order confirmed successfully"));
    }

    @PostMapping("/{id}/dispatch")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> dispatchSalesOrder(@PathVariable String id) {
        SalesOrderResponse response = salesOrderService.dispatchSalesOrder(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Sales order dispatched successfully"));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> completeSalesOrder(@PathVariable String id) {
        SalesOrderResponse response = salesOrderService.completeSalesOrder(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Sales order completed successfully"));
    }

    @PostMapping("/{id}/return")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> returnSalesOrder(
            @PathVariable String id,
            @Valid @RequestBody SalesReturnRequest request) {

        SalesOrderResponse response = salesOrderService.returnSalesOrder(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Sales return completed successfully"));
    }

    @PostMapping("/{id}/generate-invoice")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> generateInvoice(@PathVariable String id) {
        SalesOrderResponse response = salesOrderService.generateInvoice(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Invoice generated successfully"));
    }

    @GetMapping("/{id}/invoice-pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable String id) {
        byte[] pdf = salesOrderService.generateInvoicePdf(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=sales-invoice-" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @PostMapping("/{id}/update-payment")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<SalesOrderResponse>> updatePaymentStatus(
            @PathVariable String id,
            @Valid @RequestBody SalesPaymentUpdateRequest request) {

        SalesOrderResponse response = salesOrderService.updatePaymentStatus(
                id,
                request.getPaymentStatus(),
                request.getAmountPaid()
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Payment updated successfully"));
    }
}