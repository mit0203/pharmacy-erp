package com.sygnusbiotech.pharmacyerp.dashboard.controller;

import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import com.sygnusbiotech.pharmacyerp.dashboard.dto.DashboardResponse;
import com.sygnusbiotech.pharmacyerp.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(
            @RequestParam(required = false) String preset,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        DashboardResponse dashboard = dashboardService.getDashboardData(preset, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(dashboard, "Dashboard data retrieved successfully"));
    }
}