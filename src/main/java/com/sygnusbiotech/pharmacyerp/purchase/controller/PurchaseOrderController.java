    package com.sygnusbiotech.pharmacyerp.purchase.controller;

    import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
    import com.sygnusbiotech.pharmacyerp.purchase.dto.PaymentUpdateRequest;
    import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseOrderRequest;
    import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseOrderResponse;
    import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseReturnRequest;
    import com.sygnusbiotech.pharmacyerp.purchase.service.PurchaseOrderService;
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
    @RequestMapping("/api/purchases")
    @RequiredArgsConstructor
    public class PurchaseOrderController {

        private final PurchaseOrderService purchaseOrderService;

        @PostMapping
        @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
        public ResponseEntity<ApiResponse<PurchaseOrderResponse>> createPurchaseOrder(
                @Valid @RequestBody PurchaseOrderRequest request) {

            PurchaseOrderResponse response = purchaseOrderService.createPurchaseOrder(request);
            return ResponseEntity.ok(ApiResponse.success(response, "Purchase order created successfully"));
        }

        @PutMapping("/{id}")
        @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
        public ResponseEntity<ApiResponse<PurchaseOrderResponse>> updatePurchaseOrder(
                @PathVariable String id,
                @Valid @RequestBody PurchaseOrderRequest request) {

            PurchaseOrderResponse response = purchaseOrderService.updatePurchaseOrder(id, request);
            return ResponseEntity.ok(ApiResponse.success(response, "Purchase order updated successfully"));
        }

        @GetMapping("/{id}")
        @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
        public ResponseEntity<ApiResponse<PurchaseOrderResponse>> getPurchaseOrderById(@PathVariable String id) {
            PurchaseOrderResponse response = purchaseOrderService.getPurchaseOrderById(id);
            return ResponseEntity.ok(ApiResponse.success(response, "Purchase order retrieved successfully"));
        }

        @GetMapping
        @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'PHARMACIST')")
        public ResponseEntity<ApiResponse<Page<PurchaseOrderResponse>>> getAllPurchaseOrders(
                @RequestParam(required = false) String search,
                Pageable pageable) {

            Page<PurchaseOrderResponse> records = purchaseOrderService.getAllPurchaseOrders(search, pageable);
            return ResponseEntity.ok(ApiResponse.success(records, "Purchase orders retrieved successfully"));
        }

        @DeleteMapping("/{id}")
        @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
        public ResponseEntity<ApiResponse<Void>> deletePurchaseOrder(@PathVariable String id) {
            purchaseOrderService.deletePurchaseOrder(id);
            return ResponseEntity.ok(ApiResponse.success(null, "Purchase order deleted successfully"));
        }

        @PostMapping("/{id}/approve")
        @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
        public ResponseEntity<ApiResponse<PurchaseOrderResponse>> approvePurchaseOrder(@PathVariable String id) {
            PurchaseOrderResponse response = purchaseOrderService.approvePurchaseOrder(id);
            return ResponseEntity.ok(ApiResponse.success(response, "Purchase order approved successfully"));
        }

        @PostMapping("/{id}/receive")
        @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
        public ResponseEntity<ApiResponse<PurchaseOrderResponse>> receivePurchaseOrder(@PathVariable String id) {
            PurchaseOrderResponse response = purchaseOrderService.receivePurchaseOrder(id);
            return ResponseEntity.ok(ApiResponse.success(response, "Purchase order received successfully"));
        }

        @PostMapping("/{id}/return")
        @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
        public ResponseEntity<ApiResponse<PurchaseOrderResponse>> returnPurchaseOrder(
                @PathVariable String id,
                @Valid @RequestBody PurchaseReturnRequest request) {

            PurchaseOrderResponse response = purchaseOrderService.returnPurchaseOrder(id, request);
            return ResponseEntity.ok(ApiResponse.success(response, "Purchase return completed successfully"));
        }

        @PostMapping("/{id}/generate-invoice")
        @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
        public ResponseEntity<ApiResponse<PurchaseOrderResponse>> generateInvoice(@PathVariable String id) {
            PurchaseOrderResponse response = purchaseOrderService.generateInvoice(id);
            return ResponseEntity.ok(ApiResponse.success(response, "Invoice generated successfully"));
        }

        @GetMapping("/{id}/invoice-pdf")
        @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
        public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable String id) {
            byte[] pdf = purchaseOrderService.generateInvoicePdf(id);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=purchase-invoice-" + id + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdf);
        }

        @PostMapping("/{id}/update-payment")
        @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
        public ResponseEntity<ApiResponse<PurchaseOrderResponse>> updatePaymentStatus(
                @PathVariable String id,
                @Valid @RequestBody PaymentUpdateRequest request) {

            PurchaseOrderResponse response = purchaseOrderService.updatePaymentStatus(
                    id,
                    request.getPaymentStatus(),
                    request.getAmountPaid()
            );

            return ResponseEntity.ok(ApiResponse.success(response, "Payment updated successfully"));
        }
    }