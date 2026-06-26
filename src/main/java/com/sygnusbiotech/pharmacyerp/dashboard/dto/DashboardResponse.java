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

    // ==========================
    // Financial Summary
    // ==========================
    private BigDecimal totalSales;
    private BigDecimal totalPurchases;
    private BigDecimal profit;

    // ==========================
    // Today's Business
    // ==========================
    @Builder.Default
    private BigDecimal todaySales = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal todayCollections = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal todaySupplierPayments = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal todayExpenses = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal todayCashInflow = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal todayCashOutflow = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal todayNetCash = BigDecimal.ZERO;

    // ==========================
    // Outstanding Balances
    // ==========================
    @Builder.Default
    private BigDecimal outstandingReceivables = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal outstandingPayables = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal cashBalance = BigDecimal.ZERO;

    // ==========================
    // Inventory
    // ==========================
    private long totalMedicines;
    private long lowStockCount;
    private long outOfStockCount;

    // ==========================
    // Expiry
    // ==========================
    private long nearExpiryCount;
    private long expiredCount;

    // ==========================
    // Existing Pending Values
    // ==========================
    private BigDecimal pendingReceivables;
    private BigDecimal pendingPayables;

    // ==========================
    // Filter
    // ==========================
    private String appliedPreset;
    private LocalDate startDate;
    private LocalDate endDate;
    private String rangeLabel;

    // ==========================
    // Charts
    // ==========================
    private List<TrendPoint> trendData;

    private List<TopSellingItem> topSellingMedicines;

    // ==========================
    // Recent Activity
    // ==========================
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
