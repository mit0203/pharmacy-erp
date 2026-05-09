package com.sygnusbiotech.pharmacyerp.reports.controller;

import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import com.sygnusbiotech.pharmacyerp.reports.dto.*;
import com.sygnusbiotech.pharmacyerp.reports.service.ReportsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
public class ReportsController {

    private final ReportsService reportsService;

    @GetMapping("/profit-loss")
    public ResponseEntity<ApiResponse<ProfitLossReportResponse>> getProfitLossReport() {
        ProfitLossReportResponse report = reportsService.getProfitLossReport();
        return ResponseEntity.ok(ApiResponse.success(report, "Profit & Loss report generated successfully"));
    }

    @GetMapping("/sales")
    public ResponseEntity<ApiResponse<SalesReportResponse>> getSalesReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);
        SalesReportResponse report = reportsService.getSalesReport(start, end);
        return ResponseEntity.ok(ApiResponse.success(report, "Sales report generated successfully"));
    }

    @GetMapping("/purchases")
    public ResponseEntity<ApiResponse<PurchaseReportResponse>> getPurchaseReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);
        PurchaseReportResponse report = reportsService.getPurchaseReport(start, end);
        return ResponseEntity.ok(ApiResponse.success(report, "Purchase report generated successfully"));
    }

    @GetMapping("/stock")
    public ResponseEntity<ApiResponse<List<StockReportItem>>> getStockReport() {
        List<StockReportItem> report = reportsService.getStockReport();
        return ResponseEntity.ok(ApiResponse.success(report, "Stock report generated successfully"));
    }

    @GetMapping("/expiry")
    public ResponseEntity<ApiResponse<ExpiryReportResponse>> getExpiryReport(
            @RequestParam(defaultValue = "30") int days) {
        ExpiryReportResponse report = reportsService.getExpiryReport(days);
        return ResponseEntity.ok(ApiResponse.success(report, "Expiry report generated successfully"));
    }

    @GetMapping("/gst")
    public ResponseEntity<ApiResponse<GstReportResponse>> getGstReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        GstReportResponse report = reportsService.getGstReport(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(report, "GST report generated successfully"));
    }
}
