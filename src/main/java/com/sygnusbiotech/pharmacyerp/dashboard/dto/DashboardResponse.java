package com.sygnusbiotech.pharmacyerp.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    // --- Financial ---
    private BigDecimal totalSales;
    private BigDecimal totalPurchases;
    private BigDecimal profit;

    // --- Inventory ---
    private long totalMedicines;
    private long lowStockCount;
    private long outOfStockCount;

    // --- Expiry ---
    private long nearExpiryCount;
    private long expiredCount;

    // --- Payments ---
    private BigDecimal pendingReceivables;
    private BigDecimal pendingPayables;

    // --- Filter meta ---
    private String appliedPreset;
    private LocalDate startDate;
    private LocalDate endDate;
    private String rangeLabel;

    // --- Analytics ---
    private List<TrendPoint> trendData;
    private List<TopSellingItem> topSellingMedicines;

    // --- Recent ERP Activity ---
    private List<ActivityItem> recentActivities;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityItem {
        private String type;
        private String title;
        private String subtitle;
        private LocalDateTime activityTime;
        private String status;
        private BigDecimal amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        private String label;
        private LocalDate bucketDate;
        private BigDecimal sales;
        private BigDecimal purchases;
        private BigDecimal profit;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopSellingItem {
        private String medicineId;
        private String medicineName;
        private long quantitySold;
        private BigDecimal revenue;
    }
}