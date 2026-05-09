package com.sygnusbiotech.pharmacyerp.dashboard.service;

import com.sygnusbiotech.pharmacyerp.dashboard.dto.DashboardResponse;
import com.sygnusbiotech.pharmacyerp.inventory.model.Medicine;
import com.sygnusbiotech.pharmacyerp.inventory.repository.BatchRepository;
import com.sygnusbiotech.pharmacyerp.inventory.repository.MedicineRepository;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrder;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrderStatus;
import com.sygnusbiotech.pharmacyerp.purchase.repository.PurchaseOrderRepository;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesItem;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesOrder;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesOrderStatus;
import com.sygnusbiotech.pharmacyerp.sales.repository.SalesOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private static final int NEAR_EXPIRY_DAYS = 30;
    private static final int MAX_RECENT_ACTIVITIES = 8;
    private static final int MAX_TOP_SELLING_ITEMS = 5;
    private static final DateTimeFormatter DAILY_LABEL_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMM", Locale.ENGLISH);
    private static final DateTimeFormatter MONTH_LABEL_FORMATTER =
            DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

    private final SalesOrderRepository salesOrderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final MedicineRepository medicineRepository;
    private final BatchRepository batchRepository;

    public DashboardResponse getDashboardData(String preset, LocalDate startDate, LocalDate endDate) {
        log.info("Generating dashboard data for preset={}, startDate={}, endDate={}", preset, startDate, endDate);

        DateRange dateRange = resolveDateRange(preset, startDate, endDate);

        List<SalesOrder> allActiveSales =
                salesOrderRepository.findByIsDeletedFalse(Pageable.unpaged()).getContent();

        List<PurchaseOrder> allActivePurchases =
                purchaseOrderRepository.findByIsDeletedFalse(Pageable.unpaged()).getContent();

        List<Medicine> medicines = medicineRepository.findAllByIsDeletedFalse();

        List<SalesOrder> completedSales = allActiveSales.stream()
                .filter(order -> order.getStatus() == SalesOrderStatus.COMPLETED)
                .filter(order -> isWithinDateRange(resolveSalesBusinessDate(order), dateRange))
                .toList();

        List<PurchaseOrder> receivedPurchases = allActivePurchases.stream()
                .filter(order -> order.getStatus() == PurchaseOrderStatus.RECEIVED)
                .filter(order -> isWithinDateRange(resolvePurchaseBusinessDate(order), dateRange))
                .toList();

        BigDecimal totalSales = sumAmounts(
                completedSales.stream()
                        .map(SalesOrder::getTotalAmount)
                        .toList()
        );

        BigDecimal totalPurchases = sumAmounts(
                receivedPurchases.stream()
                        .map(PurchaseOrder::getTotalAmount)
                        .toList()
        );

        BigDecimal pendingReceivables = sumAmounts(
                completedSales.stream()
                        .map(order -> order.getAmountDue() != null ? order.getAmountDue() : BigDecimal.ZERO)
                        .toList()
        );

        BigDecimal pendingPayables = sumAmounts(
                receivedPurchases.stream()
                        .map(order -> order.getAmountDue() != null ? order.getAmountDue() : BigDecimal.ZERO)
                        .toList()
        );

        long totalMedicines = medicineRepository.countByIsDeletedFalse();
        long lowStockCount = medicineRepository.countLowStockMedicines();
        long outOfStockCount = medicineRepository.countOutOfStockMedicines();

        LocalDate today = LocalDate.now();
        LocalDate threshold = today.plusDays(NEAR_EXPIRY_DAYS);

        long expiredCount = batchRepository.countByExpiryDateBeforeAndIsDeletedFalse(today);
        long nearExpiryCount = batchRepository.countByExpiryDateBetweenAndIsDeletedFalse(today, threshold);

        List<DashboardResponse.ActivityItem> recentActivities =
                buildRecentActivities(allActiveSales, allActivePurchases, dateRange);

        return DashboardResponse.builder()
                .totalSales(totalSales)
                .totalPurchases(totalPurchases)
                .profit(totalSales.subtract(totalPurchases))
                .totalMedicines(totalMedicines)
                .lowStockCount(lowStockCount)
                .outOfStockCount(outOfStockCount)
                .nearExpiryCount(nearExpiryCount)
                .expiredCount(expiredCount)
                .pendingReceivables(pendingReceivables)
                .pendingPayables(pendingPayables)
                .appliedPreset(dateRange.preset())
                .startDate(dateRange.startDate())
                .endDate(dateRange.endDate())
                .rangeLabel(dateRange.label())
                .trendData(buildTrendData(completedSales, receivedPurchases, dateRange))
                .topSellingMedicines(buildTopSellingMedicines(completedSales, medicines))
                .recentActivities(recentActivities)
                .build();
    }

    private DateRange resolveDateRange(String preset, LocalDate startDate, LocalDate endDate) {
        LocalDate today = LocalDate.now();
        String normalizedPreset = preset == null || preset.isBlank()
                ? "THIS_MONTH"
                : preset.trim().toUpperCase(Locale.ENGLISH);

        if (startDate != null && endDate != null) {
            LocalDate safeStart = startDate.isAfter(endDate) ? endDate : startDate;
            LocalDate safeEnd = endDate.isBefore(startDate) ? startDate : endDate;

            return new DateRange(
                    "CUSTOM",
                    safeStart,
                    safeEnd,
                    safeStart.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH))
                            + " - " +
                            safeEnd.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH))
            );
        }

        return switch (normalizedPreset) {
            case "TODAY" -> new DateRange("TODAY", today, today, "Today");
            case "LAST_7_DAYS" -> new DateRange("LAST_7_DAYS", today.minusDays(6), today, "Last 7 Days");
            case "LAST_30_DAYS" -> new DateRange("LAST_30_DAYS", today.minusDays(29), today, "Last 30 Days");
            case "THIS_YEAR" -> new DateRange("THIS_YEAR", today.withDayOfYear(1), today, "This Year");
            case "ALL" -> new DateRange("ALL", null, null, "All Time");
            case "THIS_MONTH" -> new DateRange("THIS_MONTH", today.withDayOfMonth(1), today, "This Month");
            default -> new DateRange("THIS_MONTH", today.withDayOfMonth(1), today, "This Month");
        };
    }

    private List<DashboardResponse.TrendPoint> buildTrendData(
            List<SalesOrder> completedSales,
            List<PurchaseOrder> receivedPurchases,
            DateRange dateRange
    ) {
        List<DashboardResponse.TrendPoint> trendPoints = new ArrayList<>();

        if (dateRange.startDate() == null || dateRange.endDate() == null) {
            LocalDate anchor = LocalDate.now().withDayOfMonth(1).minusMonths(5);
            Map<LocalDate, BucketAccumulator> monthlyBuckets = new LinkedHashMap<>();

            for (int i = 0; i < 6; i++) {
                LocalDate monthStart = anchor.plusMonths(i).withDayOfMonth(1);
                monthlyBuckets.put(
                        monthStart,
                        new BucketAccumulator(monthStart, MONTH_LABEL_FORMATTER.format(monthStart))
                );
            }

            accumulateMonthlySales(monthlyBuckets, completedSales);
            accumulateMonthlyPurchases(monthlyBuckets, receivedPurchases);
            monthlyBuckets.values().forEach(bucket -> trendPoints.add(bucket.toTrendPoint()));
            return trendPoints;
        }

        long daysBetween = dateRange.endDate().toEpochDay() - dateRange.startDate().toEpochDay() + 1;

        if (daysBetween <= 31) {
            Map<LocalDate, BucketAccumulator> dailyBuckets = new LinkedHashMap<>();
            LocalDate cursor = dateRange.startDate();

            while (!cursor.isAfter(dateRange.endDate())) {
                dailyBuckets.put(cursor, new BucketAccumulator(cursor, DAILY_LABEL_FORMATTER.format(cursor)));
                cursor = cursor.plusDays(1);
            }

            accumulateDailySales(dailyBuckets, completedSales);
            accumulateDailyPurchases(dailyBuckets, receivedPurchases);
            dailyBuckets.values().forEach(bucket -> trendPoints.add(bucket.toTrendPoint()));
            return trendPoints;
        }

        Map<LocalDate, BucketAccumulator> monthlyBuckets = new LinkedHashMap<>();
        YearMonth current = YearMonth.from(dateRange.startDate());
        YearMonth endMonth = YearMonth.from(dateRange.endDate());

        while (!current.isAfter(endMonth)) {
            LocalDate monthStart = current.atDay(1);
            monthlyBuckets.put(
                    monthStart,
                    new BucketAccumulator(monthStart, MONTH_LABEL_FORMATTER.format(monthStart))
            );
            current = current.plusMonths(1);
        }

        accumulateMonthlySales(monthlyBuckets, completedSales);
        accumulateMonthlyPurchases(monthlyBuckets, receivedPurchases);
        monthlyBuckets.values().forEach(bucket -> trendPoints.add(bucket.toTrendPoint()));

        return trendPoints;
    }

    private List<DashboardResponse.TopSellingItem> buildTopSellingMedicines(
            List<SalesOrder> completedSales,
            List<Medicine> medicines
    ) {
        Map<String, Medicine> medicineMap = new LinkedHashMap<>();
        medicines.forEach(medicine -> medicineMap.put(medicine.getId(), medicine));

        Map<String, TopSellingAccumulator> totals = new LinkedHashMap<>();

        for (SalesOrder order : completedSales) {
            if (order.getItems() == null) {
                continue;
            }

            for (SalesItem item : order.getItems()) {
                if (item == null || item.getMedicineId() == null || item.getMedicineId().isBlank()) {
                    continue;
                }

                String medicineId = item.getMedicineId();
                TopSellingAccumulator accumulator =
                        totals.computeIfAbsent(medicineId, key -> new TopSellingAccumulator());

                accumulator.quantitySold += item.getQuantity() != null ? item.getQuantity() : 0;
                accumulator.revenue = accumulator.revenue.add(resolveSalesItemRevenue(item));
            }
        }

        return totals.entrySet().stream()
                .map(entry -> {
                    Medicine medicine = medicineMap.get(entry.getKey());
                    String medicineName =
                            medicine != null && medicine.getMedicineName() != null && !medicine.getMedicineName().isBlank()
                                    ? medicine.getMedicineName()
                                    : "Medicine " + entry.getKey();

                    return DashboardResponse.TopSellingItem.builder()
                            .medicineId(entry.getKey())
                            .medicineName(medicineName)
                            .quantitySold(entry.getValue().quantitySold)
                            .revenue(entry.getValue().revenue)
                            .build();
                })
                .sorted(
                        Comparator.comparingLong(DashboardResponse.TopSellingItem::getQuantitySold).reversed()
                                .thenComparing(DashboardResponse.TopSellingItem::getRevenue, Comparator.reverseOrder())
                )
                .limit(MAX_TOP_SELLING_ITEMS)
                .toList();
    }

    private void accumulateDailySales(Map<LocalDate, BucketAccumulator> buckets, List<SalesOrder> orders) {
        for (SalesOrder order : orders) {
            LocalDate date = resolveSalesBusinessDate(order);
            if (date == null) continue;

            BucketAccumulator bucket = buckets.get(date);
            if (bucket != null) {
                bucket.sales = bucket.sales.add(safeAmount(order.getTotalAmount()));
            }
        }
    }

    private void accumulateDailyPurchases(Map<LocalDate, BucketAccumulator> buckets, List<PurchaseOrder> orders) {
        for (PurchaseOrder order : orders) {
            LocalDate date = resolvePurchaseBusinessDate(order);
            if (date == null) continue;

            BucketAccumulator bucket = buckets.get(date);
            if (bucket != null) {
                bucket.purchases = bucket.purchases.add(safeAmount(order.getTotalAmount()));
            }
        }
    }

    private void accumulateMonthlySales(Map<LocalDate, BucketAccumulator> buckets, List<SalesOrder> orders) {
        for (SalesOrder order : orders) {
            LocalDate date = resolveSalesBusinessDate(order);
            if (date == null) continue;

            LocalDate key = date.withDayOfMonth(1);
            BucketAccumulator bucket = buckets.get(key);
            if (bucket != null) {
                bucket.sales = bucket.sales.add(safeAmount(order.getTotalAmount()));
            }
        }
    }

    private void accumulateMonthlyPurchases(Map<LocalDate, BucketAccumulator> buckets, List<PurchaseOrder> orders) {
        for (PurchaseOrder order : orders) {
            LocalDate date = resolvePurchaseBusinessDate(order);
            if (date == null) continue;

            LocalDate key = date.withDayOfMonth(1);
            BucketAccumulator bucket = buckets.get(key);
            if (bucket != null) {
                bucket.purchases = bucket.purchases.add(safeAmount(order.getTotalAmount()));
            }
        }
    }

    private BigDecimal resolveSalesItemRevenue(SalesItem item) {
        if (item.getLineTotal() != null) {
            return item.getLineTotal();
        }

        BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
        BigDecimal qty = BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 0);

        return unitPrice.multiply(qty);
    }

    private List<DashboardResponse.ActivityItem> buildRecentActivities(
            List<SalesOrder> salesOrders,
            List<PurchaseOrder> purchaseOrders,
            DateRange dateRange
    ) {
        List<DashboardResponse.ActivityItem> activities = new ArrayList<>();

        for (SalesOrder order : salesOrders) {
            LocalDateTime eventTime = pickSalesActivityTime(order);
            if (eventTime == null || !isWithinDateRange(eventTime.toLocalDate(), dateRange)) {
                continue;
            }

            activities.add(
                    DashboardResponse.ActivityItem.builder()
                            .type(resolveSalesType(order))
                            .title(buildSalesTitle(order))
                            .subtitle(buildSalesSubtitle(order))
                            .activityTime(eventTime)
                            .status(order.getStatus() != null ? order.getStatus().name() : null)
                            .amount(order.getTotalAmount())
                            .build()
            );
        }

        for (PurchaseOrder order : purchaseOrders) {
            LocalDateTime eventTime = pickPurchaseActivityTime(order);
            if (eventTime == null || !isWithinDateRange(eventTime.toLocalDate(), dateRange)) {
                continue;
            }

            activities.add(
                    DashboardResponse.ActivityItem.builder()
                            .type(resolvePurchaseType(order))
                            .title(buildPurchaseTitle(order))
                            .subtitle(buildPurchaseSubtitle(order))
                            .activityTime(eventTime)
                            .status(order.getStatus() != null ? order.getStatus().name() : null)
                            .amount(order.getTotalAmount())
                            .build()
            );
        }

        return activities.stream()
                .filter(item -> item.getActivityTime() != null)
                .sorted(Comparator.comparing(DashboardResponse.ActivityItem::getActivityTime).reversed())
                .limit(MAX_RECENT_ACTIVITIES)
                .toList();
    }

    private boolean isWithinDateRange(LocalDate date, DateRange dateRange) {
        if (date == null) {
            return false;
        }

        if (dateRange.startDate() == null || dateRange.endDate() == null) {
            return true;
        }

        return !date.isBefore(dateRange.startDate()) && !date.isAfter(dateRange.endDate());
    }

    private LocalDate resolveSalesBusinessDate(SalesOrder order) {
        if (order == null) return null;
        if (order.getInvoiceDate() != null) return order.getInvoiceDate().toLocalDate();
        if (order.getOrderDate() != null) return order.getOrderDate().toLocalDate();
        if (order.getUpdatedAt() != null) return order.getUpdatedAt().toLocalDate();
        if (order.getCreatedAt() != null) return order.getCreatedAt().toLocalDate();
        return null;
    }

    private LocalDate resolvePurchaseBusinessDate(PurchaseOrder order) {
        if (order == null) return null;
        if (order.getInvoiceDate() != null) return order.getInvoiceDate().toLocalDate();
        if (order.getOrderDate() != null) return order.getOrderDate().toLocalDate();
        if (order.getUpdatedAt() != null) return order.getUpdatedAt().toLocalDate();
        if (order.getCreatedAt() != null) return order.getCreatedAt().toLocalDate();
        return null;
    }

    private LocalDateTime pickSalesActivityTime(SalesOrder order) {
        if (order.getInvoiceDate() != null) return order.getInvoiceDate();
        if (order.getUpdatedAt() != null) return order.getUpdatedAt();
        if (order.getOrderDate() != null) return order.getOrderDate();
        return order.getCreatedAt();
    }

    private LocalDateTime pickPurchaseActivityTime(PurchaseOrder order) {
        if (order.getInvoiceDate() != null) return order.getInvoiceDate();
        if (order.getUpdatedAt() != null) return order.getUpdatedAt();
        if (order.getOrderDate() != null) return order.getOrderDate();
        return order.getCreatedAt();
    }

    private String resolveSalesType(SalesOrder order) {
        if (order.getInvoiceNumber() != null && !order.getInvoiceNumber().isBlank()) {
            return "SALE_INVOICED";
        }
        if (order.getPaymentStatus() == com.sygnusbiotech.pharmacyerp.sales.model.PaymentStatus.PAID) {
            return "SALE_PAID";
        }
        if (order.getStatus() == SalesOrderStatus.COMPLETED) {
            return "SALE_COMPLETED";
        }
        if (order.getStatus() == SalesOrderStatus.DISPATCHED) {
            return "SALE_DISPATCHED";
        }
        if (order.getStatus() == SalesOrderStatus.CONFIRMED) {
            return "SALE_CONFIRMED";
        }
        return "SALE_CREATED";
    }

    private String resolvePurchaseType(PurchaseOrder order) {
        if (order.getInvoiceNumber() != null && !order.getInvoiceNumber().isBlank()) {
            return "PURCHASE_INVOICED";
        }
        if (order.getPaymentStatus() == com.sygnusbiotech.pharmacyerp.purchase.model.PaymentStatus.PAID) {
            return "PURCHASE_PAID";
        }
        if (order.getStatus() == PurchaseOrderStatus.RECEIVED) {
            return "PURCHASE_RECEIVED";
        }
        if (order.getStatus() == PurchaseOrderStatus.APPROVED) {
            return "PURCHASE_APPROVED";
        }
        return "PURCHASE_CREATED";
    }

    private String buildSalesTitle(SalesOrder order) {
        String orderNumber = safe(order.getOrderNumber(), "Sales Order");

        if (order.getInvoiceNumber() != null && !order.getInvoiceNumber().isBlank()) {
            return orderNumber + " invoiced as " + order.getInvoiceNumber();
        }
        if (order.getPaymentStatus() == com.sygnusbiotech.pharmacyerp.sales.model.PaymentStatus.PAID) {
            return orderNumber + " marked as paid";
        }
        if (order.getStatus() == SalesOrderStatus.COMPLETED) {
            return orderNumber + " completed";
        }
        if (order.getStatus() == SalesOrderStatus.DISPATCHED) {
            return orderNumber + " dispatched";
        }
        if (order.getStatus() == SalesOrderStatus.CONFIRMED) {
            return orderNumber + " confirmed";
        }
        return orderNumber + " created";
    }

    private String buildPurchaseTitle(PurchaseOrder order) {
        String orderNumber = safe(order.getOrderNumber(), "Purchase Order");

        if (order.getInvoiceNumber() != null && !order.getInvoiceNumber().isBlank()) {
            return orderNumber + " invoiced as " + order.getInvoiceNumber();
        }
        if (order.getPaymentStatus() == com.sygnusbiotech.pharmacyerp.purchase.model.PaymentStatus.PAID) {
            return orderNumber + " marked as paid";
        }
        if (order.getStatus() == PurchaseOrderStatus.RECEIVED) {
            return orderNumber + " received into stock";
        }
        if (order.getStatus() == PurchaseOrderStatus.APPROVED) {
            return orderNumber + " approved";
        }
        return orderNumber + " created";
    }

    private String buildSalesSubtitle(SalesOrder order) {
        List<String> parts = new ArrayList<>();

        if (order.getCustomerId() != null && !order.getCustomerId().isBlank()) {
            parts.add("Customer: " + order.getCustomerId());
        }
        if (order.getStatus() != null) {
            parts.add("Status: " + order.getStatus().name());
        }
        if (order.getAmountDue() != null && order.getAmountDue().compareTo(BigDecimal.ZERO) > 0) {
            parts.add("Due: ₹" + order.getAmountDue());
        }

        return parts.isEmpty() ? "Sales workflow updated" : String.join(" • ", parts);
    }

    private String buildPurchaseSubtitle(PurchaseOrder order) {
        List<String> parts = new ArrayList<>();

        if (order.getSupplierId() != null && !order.getSupplierId().isBlank()) {
            parts.add("Supplier: " + order.getSupplierId());
        }
        if (order.getStatus() != null) {
            parts.add("Status: " + order.getStatus().name());
        }
        if (order.getAmountDue() != null && order.getAmountDue().compareTo(BigDecimal.ZERO) > 0) {
            parts.add("Due: ₹" + order.getAmountDue());
        }

        return parts.isEmpty() ? "Purchase workflow updated" : String.join(" • ", parts);
    }

    private String safe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private BigDecimal sumAmounts(List<BigDecimal> amounts) {
        return amounts.stream()
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal safeAmount(BigDecimal amount) {
        return amount != null ? amount : BigDecimal.ZERO;
    }

    private static final class TopSellingAccumulator {
        private long quantitySold;
        private BigDecimal revenue = BigDecimal.ZERO;
    }

    private static final class BucketAccumulator {
        private final LocalDate bucketDate;
        private final String label;
        private BigDecimal sales = BigDecimal.ZERO;
        private BigDecimal purchases = BigDecimal.ZERO;

        private BucketAccumulator(LocalDate bucketDate, String label) {
            this.bucketDate = bucketDate;
            this.label = label;
        }

        private DashboardResponse.TrendPoint toTrendPoint() {
            return DashboardResponse.TrendPoint.builder()
                    .label(label)
                    .bucketDate(bucketDate)
                    .sales(sales)
                    .purchases(purchases)
                    .profit(sales.subtract(purchases))
                    .build();
        }
    }

    private record DateRange(String preset, LocalDate startDate, LocalDate endDate, String label) {
    }
}