package com.sygnusbiotech.pharmacyerp.reports.service;

import com.sygnusbiotech.pharmacyerp.inventory.model.Batch;
import com.sygnusbiotech.pharmacyerp.inventory.model.Medicine;
import com.sygnusbiotech.pharmacyerp.inventory.repository.BatchRepository;
import com.sygnusbiotech.pharmacyerp.inventory.repository.MedicineRepository;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrder;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrderStatus;
import com.sygnusbiotech.pharmacyerp.purchase.repository.PurchaseOrderRepository;
import com.sygnusbiotech.pharmacyerp.reports.dto.*;
import com.sygnusbiotech.pharmacyerp.sales.model.Customer;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesOrder;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesOrderStatus;
import com.sygnusbiotech.pharmacyerp.sales.repository.CustomerRepository;
import com.sygnusbiotech.pharmacyerp.sales.repository.SalesOrderRepository;
import com.sygnusbiotech.pharmacyerp.supplier.model.Supplier;
import com.sygnusbiotech.pharmacyerp.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportsService {

    private final SalesOrderRepository salesOrderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final MedicineRepository medicineRepository;
    private final BatchRepository batchRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;

    public ProfitLossReportResponse getProfitLossReport() {
        log.info("Generating Profit & Loss report");

        List<SalesOrder> completedSales = salesOrderRepository
                .findByStatusAndIsDeletedFalse(SalesOrderStatus.COMPLETED);
        List<PurchaseOrder> receivedPurchases = purchaseOrderRepository
                .findByStatusAndIsDeletedFalse(PurchaseOrderStatus.RECEIVED);

        BigDecimal totalSales = sumSalesTotals(completedSales);
        BigDecimal totalPurchases = sumPurchaseTotals(receivedPurchases);
        BigDecimal profit = totalSales.subtract(totalPurchases);

        return ProfitLossReportResponse.builder()
                .totalSales(totalSales)
                .totalPurchases(totalPurchases)
                .profit(profit)
                .build();
    }

    public SalesReportResponse getSalesReport(LocalDateTime startDate, LocalDateTime endDate) {
        validateDateRange(startDate, endDate);
        log.info("Generating Sales report from {} to {}", startDate, endDate);

        List<SalesOrder> orders = salesOrderRepository
                .findByStatusAndIsDeletedFalseAndOrderDateBetween(
                        SalesOrderStatus.COMPLETED, startDate, endDate);

        Map<String, Customer> customerMap = customerRepository.findAll().stream()
                .filter(customer -> !customer.isDeleted())
                .collect(Collectors.toMap(Customer::getId, Function.identity(), (a, b) -> a));

        BigDecimal totalSales = sumSalesTotals(orders);
        BigDecimal totalGst = orders.stream()
                .map(SalesOrder::getTotalGstAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaid = orders.stream()
                .map(SalesOrder::getAmountPaid)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDue = orders.stream()
                .map(SalesOrder::getAmountDue)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageOrderValue = orders.isEmpty()
                ? BigDecimal.ZERO
                : totalSales.divide(BigDecimal.valueOf(orders.size()), 2, RoundingMode.HALF_UP);

        Map<LocalDate, BigDecimal> dailyTrendMap = new TreeMap<>();
        Map<String, BigDecimal> customerTotals = new HashMap<>();

        List<SalesReportOrderItem> orderItems = orders.stream()
                .sorted(Comparator.comparing(SalesOrder::getOrderDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(order -> {
                    String customerName = Optional.ofNullable(customerMap.get(order.getCustomerId()))
                            .map(Customer::getName)
                            .orElse(order.getCustomerId() != null ? order.getCustomerId() : "Walk-in Customer");

                    BigDecimal total = safeAmount(order.getTotalAmount());
                    LocalDate orderLocalDate = order.getOrderDate() != null ? order.getOrderDate().toLocalDate() : null;
                    if (orderLocalDate != null) {
                        dailyTrendMap.merge(orderLocalDate, total, BigDecimal::add);
                    }
                    customerTotals.merge(customerName, total, BigDecimal::add);

                    return SalesReportOrderItem.builder()
                            .orderId(order.getId())
                            .orderNumber(order.getOrderNumber())
                            .invoiceNumber(order.getInvoiceNumber())
                            .orderDate(order.getOrderDate())
                            .customerId(order.getCustomerId())
                            .customerName(customerName)
                            .status(order.getStatus() != null ? order.getStatus().name() : "-")
                            .paymentStatus(order.getPaymentStatus() != null ? order.getPaymentStatus().name() : "-")
                            .totalAmount(total)
                            .totalGstAmount(safeAmount(order.getTotalGstAmount()))
                            .amountPaid(safeAmount(order.getAmountPaid()))
                            .amountDue(safeAmount(order.getAmountDue()))
                            .itemCount(order.getItems() != null ? order.getItems().size() : 0)
                            .build();
                })
                .toList();

        Map.Entry<String, BigDecimal> topCustomer = customerTotals.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .orElse(null);

        return SalesReportResponse.builder()
                .startDate(startDate.toLocalDate())
                .endDate(endDate.toLocalDate())
                .totalSales(totalSales)
                .numberOfOrders(orders.size())
                .averageOrderValue(averageOrderValue)
                .totalGstAmount(totalGst)
                .totalAmountPaid(totalPaid)
                .totalAmountDue(totalDue)
                .topCustomerName(topCustomer != null ? topCustomer.getKey() : null)
                .topCustomerSales(topCustomer != null ? topCustomer.getValue() : BigDecimal.ZERO)
                .dailyTrend(toTrendPoints(dailyTrendMap))
                .orders(orderItems)
                .build();
    }

    public PurchaseReportResponse getPurchaseReport(LocalDateTime startDate, LocalDateTime endDate) {
        validateDateRange(startDate, endDate);
        log.info("Generating Purchase report from {} to {}", startDate, endDate);

        List<PurchaseOrder> orders = purchaseOrderRepository
                .findByStatusAndIsDeletedFalseAndOrderDateBetween(
                        PurchaseOrderStatus.RECEIVED, startDate, endDate);

        Map<String, Supplier> supplierMap = supplierRepository.findAll().stream()
                .filter(supplier -> !supplier.isDeleted())
                .collect(Collectors.toMap(Supplier::getId, Function.identity(), (a, b) -> a));

        BigDecimal totalPurchases = sumPurchaseTotals(orders);
        BigDecimal totalGst = orders.stream()
                .map(PurchaseOrder::getTotalGstAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaid = orders.stream()
                .map(PurchaseOrder::getAmountPaid)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDue = orders.stream()
                .map(PurchaseOrder::getAmountDue)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageOrderValue = orders.isEmpty()
                ? BigDecimal.ZERO
                : totalPurchases.divide(BigDecimal.valueOf(orders.size()), 2, RoundingMode.HALF_UP);

        Map<LocalDate, BigDecimal> dailyTrendMap = new TreeMap<>();
        Map<String, BigDecimal> supplierTotals = new HashMap<>();

        List<PurchaseReportOrderItem> orderItems = orders.stream()
                .sorted(Comparator.comparing(PurchaseOrder::getOrderDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(order -> {
                    String supplierName = Optional.ofNullable(supplierMap.get(order.getSupplierId()))
                            .map(Supplier::getName)
                            .orElse(order.getSupplierId() != null ? order.getSupplierId() : "Unknown Supplier");

                    BigDecimal total = safeAmount(order.getTotalAmount());
                    LocalDate orderLocalDate = order.getOrderDate() != null ? order.getOrderDate().toLocalDate() : null;
                    if (orderLocalDate != null) {
                        dailyTrendMap.merge(orderLocalDate, total, BigDecimal::add);
                    }
                    supplierTotals.merge(supplierName, total, BigDecimal::add);

                    return PurchaseReportOrderItem.builder()
                            .orderId(order.getId())
                            .orderNumber(order.getOrderNumber())
                            .invoiceNumber(order.getInvoiceNumber())
                            .orderDate(order.getOrderDate())
                            .supplierId(order.getSupplierId())
                            .supplierName(supplierName)
                            .status(order.getStatus() != null ? order.getStatus().name() : "-")
                            .paymentStatus(order.getPaymentStatus() != null ? order.getPaymentStatus().name() : "-")
                            .totalAmount(total)
                            .totalGstAmount(safeAmount(order.getTotalGstAmount()))
                            .amountPaid(safeAmount(order.getAmountPaid()))
                            .amountDue(safeAmount(order.getAmountDue()))
                            .itemCount(order.getItems() != null ? order.getItems().size() : 0)
                            .build();
                })
                .toList();

        Map.Entry<String, BigDecimal> topSupplier = supplierTotals.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .orElse(null);

        return PurchaseReportResponse.builder()
                .startDate(startDate.toLocalDate())
                .endDate(endDate.toLocalDate())
                .totalPurchases(totalPurchases)
                .numberOfOrders(orders.size())
                .averageOrderValue(averageOrderValue)
                .totalGstAmount(totalGst)
                .totalAmountPaid(totalPaid)
                .totalAmountDue(totalDue)
                .topSupplierName(topSupplier != null ? topSupplier.getKey() : null)
                .topSupplierPurchases(topSupplier != null ? topSupplier.getValue() : BigDecimal.ZERO)
                .dailyTrend(toTrendPoints(dailyTrendMap))
                .orders(orderItems)
                .build();
    }

    public List<StockReportItem> getStockReport() {
        log.info("Generating Stock report");

        List<Medicine> medicines = medicineRepository.findAllByIsDeletedFalse();

        return medicines.stream()
                .sorted(Comparator.comparing(Medicine::getMedicineName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .map(medicine -> StockReportItem.builder()
                        .medicineId(medicine.getId())
                        .medicineName(medicine.getMedicineName())
                        .sku(medicine.getSku())
                        .category(medicine.getCategory())
                        .brandName(medicine.getBrandName())
                        .stockQuantity(medicine.getStockQuantity())
                        .minimumStockLevel(medicine.getMinimumStockLevel())
                        .unitPrice(medicine.getUnitPrice())
                        .purchasePrice(medicine.getPurchasePrice())
                        .stockValue(safeAmount(medicine.getUnitPrice()).multiply(BigDecimal.valueOf(Optional.ofNullable(medicine.getStockQuantity()).orElse(0))))
                        .lowStock(Optional.ofNullable(medicine.getStockQuantity()).orElse(0) <= Optional.ofNullable(medicine.getMinimumStockLevel()).orElse(0))
                        .build())
                .toList();
    }

    public ExpiryReportResponse getExpiryReport(int days) {
        log.info("Generating Expiry report for {} days window", days);
        int safeDays = Math.max(days, 1);

        LocalDate today = LocalDate.now();
        LocalDate threshold = today.plusDays(safeDays);

        List<Batch> expiredBatches = batchRepository.findByExpiryDateBeforeAndIsDeletedFalse(today);
        List<Batch> expiringSoonBatches = batchRepository.findByExpiryDateBetweenAndIsDeletedFalse(today, threshold);

        return ExpiryReportResponse.builder()
                .days(safeDays)
                .expiringSoonCount(expiringSoonBatches.size())
                .expiredCount(expiredBatches.size())
                .expired(mapBatchesToExpiryItems(expiredBatches, today, false))
                .expiringSoon(mapBatchesToExpiryItems(expiringSoonBatches, today, true))
                .build();
    }

    public GstReportResponse getGstReport(LocalDate startDate, LocalDate endDate) {
        log.info("Generating GST report with range {} to {}", startDate, endDate);

        List<SalesOrder> completedSales;
        List<PurchaseOrder> receivedPurchases;
        LocalDate resolvedStartDate = startDate;
        LocalDate resolvedEndDate = endDate;

        if (startDate != null && endDate != null) {
            validateDateRange(startDate.atStartOfDay(), endDate.atTime(23, 59, 59));
            completedSales = salesOrderRepository.findByStatusAndIsDeletedFalseAndOrderDateBetween(
                    SalesOrderStatus.COMPLETED, startDate.atStartOfDay(), endDate.atTime(23, 59, 59));
            receivedPurchases = purchaseOrderRepository.findByStatusAndIsDeletedFalseAndOrderDateBetween(
                    PurchaseOrderStatus.RECEIVED, startDate.atStartOfDay(), endDate.atTime(23, 59, 59));
        } else {
            completedSales = salesOrderRepository.findByStatusAndIsDeletedFalse(SalesOrderStatus.COMPLETED);
            receivedPurchases = purchaseOrderRepository.findByStatusAndIsDeletedFalse(PurchaseOrderStatus.RECEIVED);

            resolvedStartDate = completedSales.stream()
                    .map(SalesOrder::getOrderDate)
                    .filter(Objects::nonNull)
                    .map(LocalDateTime::toLocalDate)
                    .min(LocalDate::compareTo)
                    .orElse(null);
            LocalDate purchaseStart = receivedPurchases.stream()
                    .map(PurchaseOrder::getOrderDate)
                    .filter(Objects::nonNull)
                    .map(LocalDateTime::toLocalDate)
                    .min(LocalDate::compareTo)
                    .orElse(null);
            if (resolvedStartDate == null || (purchaseStart != null && purchaseStart.isBefore(resolvedStartDate))) {
                resolvedStartDate = purchaseStart;
            }

            resolvedEndDate = LocalDate.now();
        }

        BigDecimal totalSalesGST = completedSales.stream()
                .map(SalesOrder::getTotalGstAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPurchaseGST = receivedPurchases.stream()
                .map(PurchaseOrder::getTotalGstAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSalesTaxable = completedSales.stream()
                .map(order -> safeAmount(order.getTotalAmount()).subtract(safeAmount(order.getTotalGstAmount())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPurchaseTaxable = receivedPurchases.stream()
                .map(order -> safeAmount(order.getTotalAmount()).subtract(safeAmount(order.getTotalGstAmount())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return GstReportResponse.builder()
                .startDate(resolvedStartDate)
                .endDate(resolvedEndDate)
                .totalSalesTaxableAmount(totalSalesTaxable)
                .totalPurchaseTaxableAmount(totalPurchaseTaxable)
                .totalSalesGST(totalSalesGST)
                .totalPurchaseGST(totalPurchaseGST)
                .netGstPayable(totalSalesGST.subtract(totalPurchaseGST))
                .build();
    }

    private List<ExpiryReportItem> mapBatchesToExpiryItems(List<Batch> batches, LocalDate today, boolean expiringSoon) {
        Set<String> medicineIds = batches.stream()
                .map(Batch::getMedicineId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, Medicine> medicineMap = medicineRepository.findAllById(medicineIds).stream()
                .collect(Collectors.toMap(Medicine::getId, Function.identity(), (a, b) -> a));

        Comparator<ExpiryReportItem> comparator = Comparator.comparing(ExpiryReportItem::getExpiryDate, Comparator.nullsLast(Comparator.naturalOrder()));
        if (!expiringSoon) {
            comparator = comparator.reversed();
        }

        return batches.stream()
                .map(batch -> {
                    Medicine medicine = medicineMap.get(batch.getMedicineId());
                    LocalDate expiryDate = batch.getExpiryDate();
                    long daysToExpiry = expiryDate != null ? ChronoUnit.DAYS.between(today, expiryDate) : 0L;
                    return ExpiryReportItem.builder()
                            .batchId(batch.getId())
                            .medicineId(batch.getMedicineId())
                            .medicineName(medicine != null ? medicine.getMedicineName() : batch.getMedicineId())
                            .batchNumber(batch.getBatchNumber())
                            .expiryDate(expiryDate)
                            .quantity(batch.getQuantity())
                            .supplierName(batch.getSupplierName())
                            .daysToExpiry(daysToExpiry)
                            .statusLabel(daysToExpiry < 0 ? "Expired" : "Expiring Soon")
                            .build();
                })
                .sorted(comparator)
                .toList();
    }

    private List<TrendPoint> toTrendPoints(Map<LocalDate, BigDecimal> trendMap) {
        return trendMap.entrySet().stream()
                .map(entry -> TrendPoint.builder()
                        .date(entry.getKey())
                        .value(entry.getValue())
                        .build())
                .toList();
    }

    private BigDecimal sumSalesTotals(List<SalesOrder> orders) {
        return orders.stream()
                .map(SalesOrder::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumPurchaseTotals(List<PurchaseOrder> orders) {
        return orders.stream()
                .map(PurchaseOrder::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal safeAmount(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private void validateDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        if (startDate == null || endDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date and end date are required.");
        }
        if (endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date cannot be before start date.");
        }
    }
}
