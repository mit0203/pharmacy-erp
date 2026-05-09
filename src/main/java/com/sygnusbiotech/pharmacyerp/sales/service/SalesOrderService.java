package com.sygnusbiotech.pharmacyerp.sales.service;

import com.sygnusbiotech.pharmacyerp.accounting.model.EntryType;
import com.sygnusbiotech.pharmacyerp.accounting.service.LedgerEntryService;
import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import com.sygnusbiotech.pharmacyerp.inventory.dto.BatchAllocation;
import com.sygnusbiotech.pharmacyerp.inventory.model.Batch;
import com.sygnusbiotech.pharmacyerp.inventory.model.Medicine;
import com.sygnusbiotech.pharmacyerp.inventory.repository.BatchRepository;
import com.sygnusbiotech.pharmacyerp.inventory.repository.MedicineRepository;
import com.sygnusbiotech.pharmacyerp.inventory.service.BatchService;
import com.sygnusbiotech.pharmacyerp.sales.dto.SalesItemRequest;
import com.sygnusbiotech.pharmacyerp.sales.dto.SalesItemResponse;
import com.sygnusbiotech.pharmacyerp.sales.dto.SalesOrderRequest;
import com.sygnusbiotech.pharmacyerp.sales.dto.SalesOrderResponse;
import com.sygnusbiotech.pharmacyerp.sales.dto.SalesReturnRequest;
import com.sygnusbiotech.pharmacyerp.sales.mapper.SalesOrderMapper;
import com.sygnusbiotech.pharmacyerp.sales.model.Customer;
import com.sygnusbiotech.pharmacyerp.sales.model.CustomerStatus;
import com.sygnusbiotech.pharmacyerp.sales.model.PaymentStatus;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesItem;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesOrder;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesOrderStatus;
import com.sygnusbiotech.pharmacyerp.sales.repository.CustomerRepository;
import com.sygnusbiotech.pharmacyerp.sales.repository.SalesOrderRepository;
import com.sygnusbiotech.pharmacyerp.settings.model.AppSettings;
import com.sygnusbiotech.pharmacyerp.settings.repository.AppSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SalesOrderService {

    private static final Logger log = LoggerFactory.getLogger(SalesOrderService.class);

    private final SalesOrderRepository salesOrderRepository;
    private final SalesOrderMapper salesOrderMapper;
    private final CustomerRepository customerRepository;
    private final MedicineRepository medicineRepository;
    private final BatchRepository batchRepository;
    private final BatchService batchService;
    private final LedgerEntryService ledgerEntryService;
    private final AppSettingsRepository appSettingsRepository;

    private static final String ACCOUNT_AR = "AR";
    private static final String ACCOUNT_SALES = "SALES";
    private static final String ACCOUNT_CASH = "CASH";
    private static final String REFERENCE_TYPE = "SALES_ORDER";

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy hh:mm a");

    @Transactional
    public SalesOrderResponse createSalesOrder(SalesOrderRequest request) {
        if (request == null) {
            throw new BusinessException("Sales order request is required", HttpStatus.BAD_REQUEST);
        }

        validateCustomer(request.getCustomerId());

        SalesOrder order = salesOrderMapper.toEntity(request);
        order.setOrderNumber("SO-" + System.currentTimeMillis());
        order.setOrderDate(LocalDateTime.now());
        order.setStatus(SalesOrderStatus.DRAFT);
        order.setPaymentStatus(PaymentStatus.UNPAID);

        calculateAndSetItems(order, request.getItems());

        order.setAmountPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        order.setAmountDue(resolvePayableTotal(order)
                .setScale(2, RoundingMode.HALF_UP));

        order = salesOrderRepository.save(order);
        return salesOrderMapper.toResponse(order);
    }

    @Transactional
    public SalesOrderResponse updateSalesOrder(String id, SalesOrderRequest request) {
        if (request == null) {
            throw new BusinessException("Sales order request is required", HttpStatus.BAD_REQUEST);
        }

        SalesOrder order = getOrderEntity(id);

        if (order.getStatus() != SalesOrderStatus.DRAFT) {
            throw new BusinessException("Only DRAFT sales orders can be updated", HttpStatus.BAD_REQUEST);
        }

        validateCustomer(request.getCustomerId());

        salesOrderMapper.updateEntityFromRequest(request, order);
        calculateAndSetItems(order, request.getItems());

        order = salesOrderRepository.save(order);
        return decorateResponse(salesOrderMapper.toResponse(order));
    }

    public SalesOrderResponse getSalesOrderById(String id) {
        return decorateResponse(salesOrderMapper.toResponse(getOrderEntity(id)));
    }

    public Page<SalesOrderResponse> getAllSalesOrders(String search, Pageable pageable) {
        Page<SalesOrder> orders;
        if (search != null && !search.trim().isEmpty()) {
            orders = salesOrderRepository.searchActiveOrders(search, pageable);
        } else {
            orders = salesOrderRepository.findByIsDeletedFalse(pageable);
        }
        return orders.map(order -> decorateResponse(salesOrderMapper.toResponse(order)));
    }

    @Transactional
    public void deleteSalesOrder(String id) {
        SalesOrder order = getOrderEntity(id);

        if (order.getStatus() != SalesOrderStatus.DRAFT) {
            throw new BusinessException("Only DRAFT sales orders can be deleted", HttpStatus.BAD_REQUEST);
        }

        order.setDeleted(true);
        salesOrderRepository.save(order);

        log.info("Draft sales order deleted safely: {}", order.getOrderNumber());
    }

    @Transactional
    public SalesOrderResponse confirmSalesOrder(String id) {
        SalesOrder order = getOrderEntity(id);

        if (order.getStatus() != SalesOrderStatus.DRAFT) {
            throw new BusinessException("Only DRAFT orders can be confirmed", HttpStatus.BAD_REQUEST);
        }

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new BusinessException("Cannot confirm sales order without items", HttpStatus.BAD_REQUEST);
        }

        List<SalesItem> allocatedItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal totalGstAmount = BigDecimal.ZERO;
        BigDecimal totalTaxable = BigDecimal.ZERO;
        BigDecimal totalCgst = BigDecimal.ZERO;
        BigDecimal totalSgst = BigDecimal.ZERO;
        BigDecimal totalIgst = BigDecimal.ZERO;

        boolean isInterState = order.getPlaceOfSupply() != null && !order.getPlaceOfSupply().isBlank() && 
             (order.getCustomerId() != null && !order.getPlaceOfSupply().equalsIgnoreCase(
                  customerRepository.findById(order.getCustomerId()).map(Customer::getState).orElse("")));

        for (SalesItem draftItem : order.getItems()) {
            Medicine medicine = medicineRepository.findByIdAndIsDeletedFalse(draftItem.getMedicineId())
                    .orElseThrow(() -> new BusinessException(
                            "Medicine not found: " + draftItem.getMedicineId(), HttpStatus.NOT_FOUND));

            List<BatchAllocation> allocations = batchService.reduceStockUsingFEFO(
                    draftItem.getMedicineId(), draftItem.getQuantity());

            for (BatchAllocation allocation : allocations) {
                BigDecimal allocatedQty = BigDecimal.valueOf(allocation.getAllocatedQuantity());
                BigDecimal unitPrice = draftItem.getUnitPrice() != null ? draftItem.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal itemBaseTotal = unitPrice.multiply(allocatedQty).setScale(2, RoundingMode.HALF_UP);
                
                BigDecimal discountPercent = draftItem.getDiscountPercent() != null ? draftItem.getDiscountPercent() : BigDecimal.ZERO;
                BigDecimal discountAmt = itemBaseTotal.multiply(discountPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                
                BigDecimal taxableValue = itemBaseTotal.subtract(discountAmt).setScale(2, RoundingMode.HALF_UP);

                BigDecimal gstPercentage = draftItem.getGstPercentage() != null ? draftItem.getGstPercentage() : BigDecimal.ZERO;
                BigDecimal itemGstAmount = taxableValue
                        .multiply(gstPercentage)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

                BigDecimal lineTotal = taxableValue.add(itemGstAmount).setScale(2, RoundingMode.HALF_UP);

                BigDecimal cgstPct = BigDecimal.ZERO, cgstAmt = BigDecimal.ZERO;
                BigDecimal sgstPct = BigDecimal.ZERO, sgstAmt = BigDecimal.ZERO;
                BigDecimal igstPct = BigDecimal.ZERO, igstAmt = BigDecimal.ZERO;

                if (isInterState) {
                    igstPct = gstPercentage;
                    igstAmt = itemGstAmount;
                } else {
                    BigDecimal halfGst = gstPercentage.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                    cgstPct = halfGst;
                    sgstPct = halfGst;
                    cgstAmt = itemGstAmount.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                    sgstAmt = itemGstAmount.subtract(cgstAmt);
                }

                // If this is the first or only allocation for this draft item, assign the free quantity to it.
                // Otherwise, assign 0 free quantity to avoid duplicating free goods.
                int freeQty = 0;
                if (allocatedItems.stream().noneMatch(i -> i.getMedicineId().equals(draftItem.getMedicineId()))) {
                    freeQty = draftItem.getFreeQuantity() != null ? draftItem.getFreeQuantity() : 0;
                }

                SalesItem batchItem = SalesItem.builder()
                        .medicineId(draftItem.getMedicineId())
                        .medicineName(medicine.getMedicineName())
                        .batchId(allocation.getBatchId())
                        .batchNumber(allocation.getBatchNumber())
                        .expiryDate(allocation.getExpiryDate())
                        .quantity(allocation.getAllocatedQuantity())
                        .freeQuantity(freeQty)
                        .unitPrice(unitPrice)
                        .mrp(draftItem.getMrp())
                        .pack(draftItem.getPack())
                        .hsn(draftItem.getHsn())
                        .discountPercent(discountPercent)
                        .taxableValue(taxableValue)
                        .gstPercentage(gstPercentage)
                        .gstAmount(itemGstAmount)
                        .cgstPercent(cgstPct)
                        .cgstAmount(cgstAmt)
                        .sgstPercent(sgstPct)
                        .sgstAmount(sgstAmt)
                        .igstPercent(igstPct)
                        .igstAmount(igstAmt)
                        .lineTotal(lineTotal)
                        .build();

                allocatedItems.add(batchItem);
                totalAmount = totalAmount.add(lineTotal);
                totalGstAmount = totalGstAmount.add(itemGstAmount);
                totalTaxable = totalTaxable.add(taxableValue);
                totalCgst = totalCgst.add(cgstAmt);
                totalSgst = totalSgst.add(sgstAmt);
                totalIgst = totalIgst.add(igstAmt);
            }
        }

        order.setItems(allocatedItems);
        order.setTotalAmount(totalAmount.setScale(2, RoundingMode.HALF_UP));
        order.setTotalGstAmount(totalGstAmount.setScale(2, RoundingMode.HALF_UP));
        order.setTotalTaxableAmount(totalTaxable.setScale(2, RoundingMode.HALF_UP));
        order.setTotalCgst(totalCgst.setScale(2, RoundingMode.HALF_UP));
        order.setTotalSgst(totalSgst.setScale(2, RoundingMode.HALF_UP));
        order.setTotalIgst(totalIgst.setScale(2, RoundingMode.HALF_UP));

        BigDecimal grandTotal = totalAmount.setScale(0, RoundingMode.HALF_UP);
        BigDecimal roundOff = grandTotal.subtract(totalAmount).setScale(2, RoundingMode.HALF_UP);
        
        order.setRoundOff(roundOff);
        order.setGrandTotal(grandTotal);

        BigDecimal currentPaid = order.getAmountPaid() == null ? BigDecimal.ZERO : order.getAmountPaid();
        if (currentPaid.compareTo(totalAmount) > 0) {
            currentPaid = totalAmount;
        }
        order.setAmountPaid(currentPaid.setScale(2, RoundingMode.HALF_UP));
        BigDecimal payableTotal = resolvePayableTotal(order);
        order.setAmountDue(payableTotal.subtract(order.getAmountPaid()).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
        order.setPaymentStatus(resolvePaymentStatus(order.getAmountPaid(), payableTotal));

        order.setStatus(SalesOrderStatus.CONFIRMED);

        log.info("Sales Order {} confirmed with {} batch-allocated line items",
                order.getOrderNumber(), allocatedItems.size());

        return decorateResponse(salesOrderMapper.toResponse(salesOrderRepository.save(order)));
    }

    @Transactional
    public SalesOrderResponse dispatchSalesOrder(String id) {
        SalesOrder order = getOrderEntity(id);

        if (order.getStatus() != SalesOrderStatus.CONFIRMED) {
            throw new BusinessException("Only CONFIRMED orders can be dispatched", HttpStatus.BAD_REQUEST);
        }

        order.setStatus(SalesOrderStatus.DISPATCHED);
        return decorateResponse(salesOrderMapper.toResponse(salesOrderRepository.save(order)));
    }

    @Transactional
    public SalesOrderResponse completeSalesOrder(String id) {
        SalesOrder order = getOrderEntity(id);

        if (order.getStatus() != SalesOrderStatus.DISPATCHED) {
            throw new BusinessException("Only DISPATCHED orders can be completed", HttpStatus.BAD_REQUEST);
        }

        order.setStatus(SalesOrderStatus.COMPLETED);
        order = salesOrderRepository.save(order);

        postSalesEntry(order);

        return decorateResponse(salesOrderMapper.toResponse(order));
    }

    @Transactional
    public SalesOrderResponse returnSalesOrder(String id, SalesReturnRequest request) {
        SalesOrder order = getOrderEntity(id);

        if (order.getStatus() != SalesOrderStatus.COMPLETED) {
            throw new BusinessException("Only COMPLETED sales orders can be returned", HttpStatus.BAD_REQUEST);
        }

        if (order.getTotalAmount() == null || order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("This sales order is already fully returned", HttpStatus.BAD_REQUEST);
        }

        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            throw new BusinessException("At least one return item is required", HttpStatus.BAD_REQUEST);
        }

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new BusinessException("Sales order has no items left to return", HttpStatus.BAD_REQUEST);
        }

        Set<String> requestedMedicineIds = new HashSet<>();
        BigDecimal totalReturnAmount = BigDecimal.ZERO;
        BigDecimal totalReturnGstAmount = BigDecimal.ZERO;

        for (SalesReturnRequest.SalesReturnItemRequest returnItem : request.getItems()) {
            if (returnItem.getMedicineId() == null || returnItem.getMedicineId().isBlank()) {
                throw new BusinessException("Medicine ID is required for return item", HttpStatus.BAD_REQUEST);
            }

            if (!requestedMedicineIds.add(returnItem.getMedicineId())) {
                throw new BusinessException(
                        "Duplicate medicine found in return request: " + returnItem.getMedicineId(),
                        HttpStatus.BAD_REQUEST
                );
            }

            if (returnItem.getQuantity() == null || returnItem.getQuantity() <= 0) {
                throw new BusinessException("Return quantity must be greater than 0", HttpStatus.BAD_REQUEST);
            }

            int availableReturnQty = order.getItems()
                    .stream()
                    .filter(item -> item.getMedicineId() != null && item.getMedicineId().equals(returnItem.getMedicineId()))
                    .mapToInt(item -> item.getQuantity() == null ? 0 : item.getQuantity())
                    .sum();

            if (availableReturnQty <= 0) {
                throw new BusinessException(
                        "This item is already fully returned: " + returnItem.getMedicineId(),
                        HttpStatus.BAD_REQUEST
                );
            }

            if (returnItem.getQuantity() > availableReturnQty) {
                throw new BusinessException(
                        "Return quantity cannot be greater than available sold quantity. Available: " + availableReturnQty,
                        HttpStatus.BAD_REQUEST
                );
            }

            int remainingToReturn = returnItem.getQuantity();

            for (SalesItem item : order.getItems()) {
                if (remainingToReturn <= 0) {
                    break;
                }

                if (item.getMedicineId() == null || !item.getMedicineId().equals(returnItem.getMedicineId())) {
                    continue;
                }

                int itemQty = item.getQuantity() == null ? 0 : item.getQuantity();
                if (itemQty <= 0) {
                    continue;
                }

                int reduceQty = Math.min(itemQty, remainingToReturn);

                restoreStockForReturnedItem(item, reduceQty);

                BigDecimal unitPrice = item.getUnitPrice() == null ? BigDecimal.ZERO : item.getUnitPrice();
                BigDecimal gstPercentage = item.getGstPercentage() == null ? BigDecimal.ZERO : item.getGstPercentage();

                BigDecimal baseReturnAmount = unitPrice
                        .multiply(BigDecimal.valueOf(reduceQty))
                        .setScale(2, RoundingMode.HALF_UP);

                BigDecimal returnGstAmount = baseReturnAmount
                        .multiply(gstPercentage)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

                BigDecimal lineReturnTotal = baseReturnAmount
                        .add(returnGstAmount)
                        .setScale(2, RoundingMode.HALF_UP);

                totalReturnAmount = totalReturnAmount.add(lineReturnTotal);
                totalReturnGstAmount = totalReturnGstAmount.add(returnGstAmount);

                int remainingQty = itemQty - reduceQty;
                item.setQuantity(Math.max(remainingQty, 0));
                recalculateSalesItemTotals(item);

                remainingToReturn -= reduceQty;
            }

            if (remainingToReturn > 0) {
                throw new BusinessException(
                        "Unable to process full return quantity for medicine: " + returnItem.getMedicineId(),
                        HttpStatus.BAD_REQUEST
                );
            }
        }

        List<SalesItem> remainingItems = new ArrayList<>();
        for (SalesItem item : order.getItems()) {
            if (item.getQuantity() != null && item.getQuantity() > 0) {
                remainingItems.add(item);
            }
        }
        order.setItems(remainingItems);

        BigDecimal currentTotal = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        BigDecimal currentGst = order.getTotalGstAmount() == null ? BigDecimal.ZERO : order.getTotalGstAmount();

        BigDecimal newTotal = currentTotal.subtract(totalReturnAmount).setScale(2, RoundingMode.HALF_UP);
        BigDecimal newGst = currentGst.subtract(totalReturnGstAmount).setScale(2, RoundingMode.HALF_UP);

        if (newTotal.compareTo(BigDecimal.ZERO) < 0) {
            newTotal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (newGst.compareTo(BigDecimal.ZERO) < 0) {
            newGst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal amountPaid = order.getAmountPaid() == null ? BigDecimal.ZERO : order.getAmountPaid();
        if (amountPaid.compareTo(newTotal) > 0) {
            amountPaid = newTotal;
        }

        BigDecimal amountDue = newTotal.subtract(amountPaid).setScale(2, RoundingMode.HALF_UP);
        if (amountDue.compareTo(BigDecimal.ZERO) < 0) {
            amountDue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        order.setTotalAmount(newTotal);
        order.setTotalGstAmount(newGst);
        order.setAmountPaid(amountPaid.setScale(2, RoundingMode.HALF_UP));
        order.setAmountDue(amountDue);

        if (newTotal.compareTo(BigDecimal.ZERO) == 0 || amountDue.compareTo(BigDecimal.ZERO) == 0) {
            order.setPaymentStatus(PaymentStatus.PAID);
        } else if (amountPaid.compareTo(BigDecimal.ZERO) > 0) {
            order.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
        } else {
            order.setPaymentStatus(PaymentStatus.UNPAID);
        }

        String reason = request.getReason() == null || request.getReason().isBlank()
                ? "No reason provided"
                : request.getReason().trim();

        String oldNotes = order.getNotes() == null || order.getNotes().isBlank()
                ? ""
                : order.getNotes() + "\n";

        order.setNotes(oldNotes +
                "Sales Return [" + LocalDateTime.now().format(DATE_TIME_FORMATTER) + "]: " +
                reason +
                " | Return Amount: " + totalReturnAmount.setScale(2, RoundingMode.HALF_UP));

        SalesOrder saved = salesOrderRepository.save(order);

        log.info("Sales return completed for {}. Return amount: {}", saved.getOrderNumber(), totalReturnAmount);

        return decorateResponse(salesOrderMapper.toResponse(saved));
    }

    private void restoreStockForReturnedItem(SalesItem item, int returnQuantity) {
        if (returnQuantity <= 0) {
            return;
        }

        if (item.getBatchId() == null || item.getBatchId().isBlank()) {
            throw new BusinessException("Batch missing for returned sales item", HttpStatus.BAD_REQUEST);
        }

        Batch batch = batchRepository.findByIdAndIsDeletedFalse(item.getBatchId())
                .orElseThrow(() -> new BusinessException(
                        "Batch not found while processing sales return: " + item.getBatchId(),
                        HttpStatus.NOT_FOUND
                ));

        batch.setQuantity((batch.getQuantity() == null ? 0 : batch.getQuantity()) + returnQuantity);
        batchRepository.save(batch);

        Medicine medicine = medicineRepository.findByIdAndIsDeletedFalse(item.getMedicineId())
                .orElseThrow(() -> new BusinessException(
                        "Medicine not found while processing sales return: " + item.getMedicineId(),
                        HttpStatus.NOT_FOUND
                ));

        medicine.setStockQuantity((medicine.getStockQuantity() == null ? 0 : medicine.getStockQuantity()) + returnQuantity);
        medicineRepository.save(medicine);
    }

    private void recalculateSalesItemTotals(SalesItem item) {
        int qty = item.getQuantity() == null ? 0 : item.getQuantity();
        BigDecimal unitPrice = item.getUnitPrice() == null ? BigDecimal.ZERO : item.getUnitPrice();
        BigDecimal gstPercentage = item.getGstPercentage() == null ? BigDecimal.ZERO : item.getGstPercentage();

        BigDecimal baseTotal = unitPrice.multiply(BigDecimal.valueOf(qty));
        BigDecimal gstAmount = baseTotal
                .multiply(gstPercentage)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal lineTotal = baseTotal.add(gstAmount).setScale(2, RoundingMode.HALF_UP);

        item.setGstAmount(gstAmount);
        item.setLineTotal(lineTotal);
    }

    @Transactional
    public SalesOrderResponse generateInvoice(String id) {
        SalesOrder order = getOrderEntity(id);

        if (order.getStatus() != SalesOrderStatus.COMPLETED) {
            throw new BusinessException("Invoice can only be generated after the order is COMPLETED", HttpStatus.BAD_REQUEST);
        }

        if (order.getInvoiceNumber() != null) {
            throw new BusinessException("Invoice has already been generated for this order", HttpStatus.CONFLICT);
        }

        String generatedInvoiceNumber = "SINV-" + order.getId() + "-" + System.currentTimeMillis();

        if (salesOrderRepository.existsByInvoiceNumberAndIsDeletedFalse(generatedInvoiceNumber)) {
            throw new BusinessException("Invoice number conflict, please try again", HttpStatus.CONFLICT);
        }

        order.setInvoiceNumber(generatedInvoiceNumber);
        order.setInvoiceDate(LocalDateTime.now());

        return decorateResponse(salesOrderMapper.toResponse(salesOrderRepository.save(order)));
    }

    @Transactional
    public SalesOrderResponse updatePaymentStatus(String id, PaymentStatus newStatus, BigDecimal requestedAmountPaid) {
        SalesOrder order = getOrderEntity(id);

        if (order.getInvoiceNumber() == null || order.getInvoiceNumber().isBlank()) {
            throw new BusinessException("Payment can only be updated after invoice is generated", HttpStatus.BAD_REQUEST);
        }

        if (newStatus == null) {
            throw new BusinessException("Payment status is required", HttpStatus.BAD_REQUEST);
        }

        PaymentStatus previousStatus = order.getPaymentStatus();

        BigDecimal payableTotal = resolvePayableTotal(order);
        BigDecimal previousPaid = money(order.getAmountPaid());

        if (payableTotal.compareTo(BigDecimal.ZERO) <= 0) {
            order.setAmountPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            order.setAmountDue(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            order.setPaymentStatus(PaymentStatus.PAID);
            return decorateResponse(salesOrderMapper.toResponse(salesOrderRepository.save(order)));
        }

        BigDecimal newPaid;

        if (newStatus == PaymentStatus.UNPAID) {
            if (previousPaid.compareTo(BigDecimal.ZERO) > 0) {
                throw new BusinessException("Cannot mark unpaid after payment has been made", HttpStatus.BAD_REQUEST);
            }
            newPaid = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        } else if (newStatus == PaymentStatus.PARTIALLY_PAID) {
            if (requestedAmountPaid == null || requestedAmountPaid.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("Partial amount must be greater than 0", HttpStatus.BAD_REQUEST);
            }

            BigDecimal inputAmount = requestedAmountPaid.setScale(2, RoundingMode.HALF_UP);

            if (inputAmount.compareTo(payableTotal) >= 0) {
                throw new BusinessException("Partial amount must be less than total amount. Use PAID for full payment.", HttpStatus.BAD_REQUEST);
            }

            if (inputAmount.compareTo(previousPaid) < 0) {
                throw new BusinessException("Cannot reduce already paid amount", HttpStatus.BAD_REQUEST);
            }

            newPaid = inputAmount;
        } else if (newStatus == PaymentStatus.PAID) {
            newPaid = payableTotal;
        } else {
            throw new BusinessException("Invalid payment status", HttpStatus.BAD_REQUEST);
        }

        order.setAmountPaid(newPaid.setScale(2, RoundingMode.HALF_UP));
        order.setAmountDue(payableTotal.subtract(order.getAmountPaid()).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
        order.setPaymentStatus(resolvePaymentStatus(order.getAmountPaid(), payableTotal));

        order = salesOrderRepository.save(order);

        if (order.getPaymentStatus() == PaymentStatus.PAID && previousStatus != PaymentStatus.PAID) {
            postSalesReceiptEntry(order);
        }

        return decorateResponse(salesOrderMapper.toResponse(order));
    }

    public byte[] generateInvoicePdf(String id) {
        SalesOrder order = getOrderEntity(id);

        if (order.getInvoiceNumber() == null || order.getInvoiceNumber().isBlank()) {
            throw new BusinessException("Invoice not generated yet", HttpStatus.BAD_REQUEST);
        }

        Customer customer = customerRepository.findByIdAndDeletedFalse(order.getCustomerId())
                .orElseThrow(() -> new BusinessException("Customer not found", HttpStatus.NOT_FOUND));

        AppSettings settings = appSettingsRepository.findAll().stream().findFirst().orElse(new AppSettings());
        AppSettings.Business biz = settings.getBusiness() != null ? settings.getBusiness() : new AppSettings.Business();
        AppSettings.Invoices inv = settings.getInvoices() != null ? settings.getInvoices() : new AppSettings.Invoices();

        InvoicePdfGenerator.InvoiceData d = new InvoicePdfGenerator.InvoiceData();
        d.title = "TAX INVOICE";
        d.subtitle = "SALES INVOICE";
        d.companyName = biz.getCompanyName();
        d.companyAddress = biz.getCompanyAddress();
        d.companyPhone = biz.getCompanyPhone();
        d.companyEmail = biz.getCompanyEmail();
        d.companyGstin = biz.getGstin();
        d.companyDl = biz.getDrugLicenseNumber();
        d.companyStateCode = biz.getStateCode();
        d.companyState = biz.getState();
        d.bankName = biz.getBankName();
        d.bankAccount = biz.getBankAccountNumber();
        d.bankIfsc = biz.getBankIfscCode();
        d.bankBranch = biz.getBankBranch();

        d.partyLabel = "Bill To / Buyer";
        d.partyName = customer.getName();
        d.partyAddress = customer.getAddress();
        d.partyPhone = customer.getPhone();
        d.partyEmail = customer.getEmail();
        d.partyGstin = customer.getGstNumber();
        d.partyDl = customer.getDlNumber();
        d.partyState = customer.getState();
        d.partyStateCode = customer.getStateCode();

        d.invoiceNumber = order.getInvoiceNumber();
        d.orderNumber = order.getOrderNumber();
        d.invoiceDate = order.getInvoiceDate();
        d.orderDate = order.getOrderDate();
        d.dueDate = order.getDueDate();
        d.lrNumber = order.getLrNumber();
        d.transport = order.getTransport();
        d.placeOfSupply = order.getPlaceOfSupply();
        d.reverseCharge = order.isReverseCharge();
        d.paymentStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().name() : "-";

        List<SalesItem> items = order.getItems() != null ? order.getItems() : List.of();
        int n = items.size();
        d.itemCount = n;
        d.medicineName = new String[n]; d.batchNumber = new String[n]; d.pack = new String[n];
        d.hsn = new String[n]; d.mfgDate = new String[n]; d.expDate = new String[n];
        d.mrp = new BigDecimal[n]; d.rate = new BigDecimal[n];
        d.qty = new int[n]; d.freeQty = new int[n];
        d.discPct = new BigDecimal[n]; d.taxableValue = new BigDecimal[n]; d.gstPct = new BigDecimal[n];
        d.cgstPct = new BigDecimal[n]; d.cgstAmt = new BigDecimal[n];
        d.sgstPct = new BigDecimal[n]; d.sgstAmt = new BigDecimal[n];
        d.igstPct = new BigDecimal[n]; d.igstAmt = new BigDecimal[n];
        d.lineTotal = new BigDecimal[n];

        int totalQty = 0;
        BigDecimal totalTaxable = BigDecimal.ZERO, totalCgst = BigDecimal.ZERO;
        BigDecimal totalSgst = BigDecimal.ZERO, totalIgst = BigDecimal.ZERO;

        for (int i = 0; i < n; i++) {
            SalesItem it = items.get(i);
            Medicine med = null;
            try { med = medicineRepository.findByIdAndIsDeletedFalse(it.getMedicineId()).orElse(null); } catch (Exception ignored) {}
            d.medicineName[i] = it.getMedicineName() != null ? it.getMedicineName() : 
                               (med != null ? displayMedicineName(med) : it.getMedicineId());
            d.pack[i] = it.getPack();
            d.hsn[i] = it.getHsn();

            String bNo = it.getBatchNumber();
            String eDt = it.getExpiryDate() != null ? it.getExpiryDate().format(DateTimeFormatter.ofPattern("MM/yy")) : "-";

            if ((bNo == null || bNo.isBlank() || "-".equals(eDt)) && it.getBatchId() != null) {
                try { 
                    Batch batch = batchRepository.findById(it.getBatchId()).orElse(null); 
                    if (batch != null) {
                        if (bNo == null || bNo.isBlank()) bNo = batch.getBatchNumber();
                        if ("-".equals(eDt) && batch.getExpiryDate() != null) 
                            eDt = batch.getExpiryDate().format(DateTimeFormatter.ofPattern("MM/yy"));
                    }
                } catch (Exception ignored) {}
            }
            
            d.batchNumber[i] = bNo != null ? bNo : "-";
            d.expDate[i] = eDt;
            d.mfgDate[i] = "-"; // Mfg date not usually tracked in SalesItem
            d.mrp[i] = it.getMrp();
            d.rate[i] = it.getUnitPrice();
            d.qty[i] = it.getQuantity() != null ? it.getQuantity() : 0;
            d.freeQty[i] = it.getFreeQuantity() != null ? it.getFreeQuantity() : 0;
            d.discPct[i] = it.getDiscountPercent();
            d.taxableValue[i] = it.getTaxableValue();
            d.gstPct[i] = it.getGstPercentage();
            d.cgstPct[i] = it.getCgstPercent();
            d.cgstAmt[i] = it.getCgstAmount();
            d.sgstPct[i] = it.getSgstPercent();
            d.sgstAmt[i] = it.getSgstAmount();
            d.igstPct[i] = it.getIgstPercent();
            d.igstAmt[i] = it.getIgstAmount();
            d.lineTotal[i] = it.getLineTotal();

            totalQty += d.qty[i];
            totalTaxable = totalTaxable.add(it.getTaxableValue() != null ? it.getTaxableValue() : BigDecimal.ZERO);
            totalCgst = totalCgst.add(it.getCgstAmount() != null ? it.getCgstAmount() : BigDecimal.ZERO);
            totalSgst = totalSgst.add(it.getSgstAmount() != null ? it.getSgstAmount() : BigDecimal.ZERO);
            totalIgst = totalIgst.add(it.getIgstAmount() != null ? it.getIgstAmount() : BigDecimal.ZERO);
        }

        d.totalQty = totalQty;
        d.totalTaxable = totalTaxable;
        d.totalCgst = totalCgst;
        d.totalSgst = totalSgst;
        d.totalIgst = totalIgst;
        d.roundOff = order.getRoundOff() != null ? order.getRoundOff() : BigDecimal.ZERO;
        d.grandTotal = order.getGrandTotal() != null ? order.getGrandTotal() : order.getTotalAmount();
        d.amountPaid = order.getAmountPaid();
        d.amountDue = order.getAmountDue();
        d.termsAndConditions = order.getTermsAndConditions() != null ? order.getTermsAndConditions() : inv.getTermsAndConditions();
        d.jurisdiction = inv.getJurisdiction();
        d.footerNote = inv.getFooterNote();

        try {
            return InvoicePdfGenerator.generate(d);
        } catch (Exception e) {
            throw new BusinessException("PDF generation failed: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    private void restoreStockForAllocatedItems(SalesOrder order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }

        for (SalesItem item : order.getItems()) {
            if (item.getBatchId() == null || item.getBatchId().isBlank()) {
                continue;
            }

            int qtyToRestore = item.getQuantity() == null ? 0 : item.getQuantity();

            if (qtyToRestore <= 0) {
                continue;
            }

            Batch batch = batchRepository.findByIdAndIsDeletedFalse(item.getBatchId())
                    .orElseThrow(() -> new BusinessException(
                            "Batch not found while restoring stock: " + item.getBatchId(),
                            HttpStatus.NOT_FOUND
                    ));

            batch.setQuantity((batch.getQuantity() == null ? 0 : batch.getQuantity()) + qtyToRestore);
            batchRepository.save(batch);

            Medicine medicine = medicineRepository.findByIdAndIsDeletedFalse(item.getMedicineId())
                    .orElseThrow(() -> new BusinessException(
                            "Medicine not found while restoring stock: " + item.getMedicineId(),
                            HttpStatus.NOT_FOUND
                    ));

            medicine.setStockQuantity(
                    (medicine.getStockQuantity() == null ? 0 : medicine.getStockQuantity()) + qtyToRestore
            );

            medicineRepository.save(medicine);
        }

        log.info("Stock restored for cancelled/deleted Sales Order: {}", order.getOrderNumber());
    }

    private void validateCustomer(String customerId) {
        if (customerId == null || customerId.isBlank()) {
            throw new BusinessException("Customer is required", HttpStatus.BAD_REQUEST);
        }

        Customer customer = customerRepository.findByIdAndDeletedFalse(customerId)
                .orElseThrow(() -> new BusinessException("Customer not found", HttpStatus.NOT_FOUND));

        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw new BusinessException("Customer is not active", HttpStatus.BAD_REQUEST);
        }
    }

    private void calculateAndSetItems(SalesOrder order, List<SalesItemRequest> itemRequests) {
        if (itemRequests == null || itemRequests.isEmpty()) {
            throw new BusinessException("Sales order must contain at least one item", HttpStatus.BAD_REQUEST);
        }

        BigDecimal totalAmt = BigDecimal.ZERO;
        BigDecimal totalGstAmt = BigDecimal.ZERO;
        BigDecimal totalTaxable = BigDecimal.ZERO;
        BigDecimal totalCgst = BigDecimal.ZERO;
        BigDecimal totalSgst = BigDecimal.ZERO;
        BigDecimal totalIgst = BigDecimal.ZERO;
        List<SalesItem> items = new ArrayList<>();
        Set<String> medicineIds = new HashSet<>();

        // Helper to check if interstate based on order place of supply vs customer state
        boolean isInterState = order.getPlaceOfSupply() != null && !order.getPlaceOfSupply().isBlank() && 
             (order.getCustomerId() != null && !order.getPlaceOfSupply().equalsIgnoreCase(
                  customerRepository.findById(order.getCustomerId()).map(Customer::getState).orElse("")));

        for (SalesItemRequest req : itemRequests) {
            if (req.getMedicineId() == null || req.getMedicineId().isBlank()) {
                throw new BusinessException("Medicine is required in sales item", HttpStatus.BAD_REQUEST);
            }

            if (!medicineIds.add(req.getMedicineId())) {
                throw new BusinessException("Duplicate medicine found in sales order: " + req.getMedicineId(), HttpStatus.BAD_REQUEST);
            }

            Medicine medicine = medicineRepository.findByIdAndIsDeletedFalse(req.getMedicineId())
                    .orElseThrow(() -> new BusinessException(
                            "Medicine not found for ID: " + req.getMedicineId(), HttpStatus.NOT_FOUND));

            if (req.getQuantity() == null || req.getQuantity() <= 0) {
                throw new BusinessException("Sales quantity must be greater than 0", HttpStatus.BAD_REQUEST);
            }

            if (req.getUnitPrice() == null || req.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessException("Unit price cannot be negative", HttpStatus.BAD_REQUEST);
            }

            if (req.getGstPercentage() == null || req.getGstPercentage().compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessException("GST percentage cannot be negative", HttpStatus.BAD_REQUEST);
            }

            int availableStock = medicine.getStockQuantity() == null ? 0 : medicine.getStockQuantity();
            if (availableStock < req.getQuantity()) {
                throw new BusinessException(
                        "Not enough stock for medicine: " + displayMedicineName(medicine) + ". Available stock: " + availableStock,
                        HttpStatus.BAD_REQUEST
                );
            }

            BigDecimal unitPrice = req.getUnitPrice().setScale(2, RoundingMode.HALF_UP);
            BigDecimal gstPercentage = req.getGstPercentage().setScale(2, RoundingMode.HALF_UP);
            
            // Calculate base amount
            BigDecimal itemBaseTotal = unitPrice.multiply(BigDecimal.valueOf(req.getQuantity())).setScale(2, RoundingMode.HALF_UP);
            
            // Apply discount if any
            BigDecimal discountPercent = req.getDiscountPercent() != null ? req.getDiscountPercent() : BigDecimal.ZERO;
            BigDecimal discountAmt = itemBaseTotal.multiply(discountPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            
            BigDecimal taxableValue = itemBaseTotal.subtract(discountAmt).setScale(2, RoundingMode.HALF_UP);
            
            BigDecimal itemGstAmount = taxableValue
                    .multiply(gstPercentage)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    
            BigDecimal lineTotal = taxableValue.add(itemGstAmount).setScale(2, RoundingMode.HALF_UP);

            // Split GST
            BigDecimal cgstPct = BigDecimal.ZERO, cgstAmt = BigDecimal.ZERO;
            BigDecimal sgstPct = BigDecimal.ZERO, sgstAmt = BigDecimal.ZERO;
            BigDecimal igstPct = BigDecimal.ZERO, igstAmt = BigDecimal.ZERO;

            if (isInterState) {
                igstPct = gstPercentage;
                igstAmt = itemGstAmount;
            } else {
                BigDecimal halfGst = gstPercentage.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                cgstPct = halfGst;
                sgstPct = halfGst;
                cgstAmt = itemGstAmount.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                sgstAmt = itemGstAmount.subtract(cgstAmt); // to handle rounding
            }

            Medicine med = medicineRepository.findByIdAndIsDeletedFalse(req.getMedicineId())
                    .orElseThrow(() -> new BusinessException("Medicine not found: " + req.getMedicineId(), HttpStatus.NOT_FOUND));

            SalesItem item = SalesItem.builder()
                    .medicineId(req.getMedicineId())
                    .medicineName(displayMedicineName(med))
                    .batchId(null)
                    .batchNumber(req.getBatchNumber())
                    .expiryDate(req.getExpiryDate())
                    .quantity(req.getQuantity())
                    .freeQuantity(req.getFreeQuantity() != null ? req.getFreeQuantity() : 0)
                    .unitPrice(unitPrice)
                    .mrp(req.getMrp())
                    .pack(req.getPack())
                    .hsn(req.getHsn())
                    .discountPercent(discountPercent)
                    .taxableValue(taxableValue)
                    .gstPercentage(gstPercentage)
                    .gstAmount(itemGstAmount)
                    .cgstPercent(cgstPct)
                    .cgstAmount(cgstAmt)
                    .sgstPercent(sgstPct)
                    .sgstAmount(sgstAmt)
                    .igstPercent(igstPct)
                    .igstAmount(igstAmt)
                    .lineTotal(lineTotal)
                    .build();

            items.add(item);
            totalAmt = totalAmt.add(lineTotal);
            totalGstAmt = totalGstAmt.add(itemGstAmount);
            totalTaxable = totalTaxable.add(taxableValue);
            totalCgst = totalCgst.add(cgstAmt);
            totalSgst = totalSgst.add(sgstAmt);
            totalIgst = totalIgst.add(igstAmt);
        }

        order.setItems(items);
        order.setTotalAmount(totalAmt.setScale(2, RoundingMode.HALF_UP));
        order.setTotalGstAmount(totalGstAmt.setScale(2, RoundingMode.HALF_UP));
        order.setTotalTaxableAmount(totalTaxable.setScale(2, RoundingMode.HALF_UP));
        order.setTotalCgst(totalCgst.setScale(2, RoundingMode.HALF_UP));
        order.setTotalSgst(totalSgst.setScale(2, RoundingMode.HALF_UP));
        order.setTotalIgst(totalIgst.setScale(2, RoundingMode.HALF_UP));
        
        // Rounding
        BigDecimal grandTotal = totalAmt.setScale(0, RoundingMode.HALF_UP);
        BigDecimal roundOff = grandTotal.subtract(totalAmt).setScale(2, RoundingMode.HALF_UP);
        
        order.setRoundOff(roundOff);
        order.setGrandTotal(grandTotal);

        BigDecimal paid = money(order.getAmountPaid());
        if (paid.compareTo(totalAmt) > 0) {
            paid = totalAmt;
        }

        order.setAmountPaid(paid.setScale(2, RoundingMode.HALF_UP));
        BigDecimal payableTotal = resolvePayableTotal(order);
        order.setAmountDue(payableTotal.subtract(paid).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
        order.setPaymentStatus(resolvePaymentStatus(order.getAmountPaid(), payableTotal));
    }

    private SalesOrder getOrderEntity(String id) {
        if (id == null || id.isBlank()) {
            throw new BusinessException("Sales order ID is required", HttpStatus.BAD_REQUEST);
        }

        return salesOrderRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Sales order not found", HttpStatus.NOT_FOUND));
    }

    private void postSalesEntry(SalesOrder order) {
        try {
            ledgerEntryService.createEntryFromEvent(
                    REFERENCE_TYPE,
                    order.getOrderNumber(),
                    "Sale completed: " + order.getOrderNumber(),
                    ACCOUNT_AR,
                    ACCOUNT_SALES,
                    order.getTotalAmount(),
                    EntryType.SALES
            );
            log.info("Accounting: SALES entry posted for {}", order.getOrderNumber());
        } catch (Exception e) {
            log.error("Accounting: Failed to post SALES entry for {} — {}", order.getOrderNumber(), e.getMessage());
        }
    }

    private void postSalesReceiptEntry(SalesOrder order) {
        try {
            ledgerEntryService.createEntryFromEvent(
                    REFERENCE_TYPE,
                    order.getOrderNumber(),
                    "Customer payment received: " + order.getOrderNumber(),
                    ACCOUNT_CASH,
                    ACCOUNT_AR,
                    order.getAmountPaid(),
                    EntryType.SALES_RECEIPT
            );
            log.info("Accounting: SALES_RECEIPT entry posted for {}", order.getOrderNumber());
        } catch (Exception e) {
            log.error("Accounting: Failed to post SALES_RECEIPT entry for {} — {}", order.getOrderNumber(), e.getMessage());
        }
    }

    private String resolveBatchDisplay(String batchId) {
        if (batchId == null || batchId.isBlank()) {
            return "-";
        }

        try {
            return batchRepository.findById(batchId)
                    .map(batch -> {
                        String batchValue = firstNonBlank(
                                invokeStringGetter(batch, "getBatchNumber"),
                                invokeStringGetter(batch, "getBatchCode"),
                                invokeStringGetter(batch, "getLotNumber"),
                                invokeStringGetter(batch, "getCode")
                        );
                        return batchValue != null ? batchValue : batchId;
                    })
                    .orElse(batchId);
        } catch (Exception e) {
            return batchId;
        }
    }

    private String invokeStringGetter(Object target, String methodName) {
        try {
            java.lang.reflect.Method method = target.getClass().getMethod(methodName);
            Object value = method.invoke(target);
            if (value instanceof String str && !str.isBlank()) {
                return str;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }

        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String safe(String v) {
        return v == null || v.isBlank() ? "-" : v;
    }

    private BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal resolvePayableTotal(SalesOrder order) {
        if (order == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal payable = order.getGrandTotal() != null ? order.getGrandTotal() : order.getTotalAmount();
        return money(payable);
    }

    private PaymentStatus resolvePaymentStatus(BigDecimal paid, BigDecimal total) {
        BigDecimal safePaid = money(paid);
        BigDecimal safeTotal = money(total);

        if (safeTotal.compareTo(BigDecimal.ZERO) <= 0) {
            return PaymentStatus.PAID;
        }

        if (safePaid.compareTo(BigDecimal.ZERO) <= 0) {
            return PaymentStatus.UNPAID;
        }

        if (safePaid.compareTo(safeTotal) >= 0) {
            return PaymentStatus.PAID;
        }

        return PaymentStatus.PARTIALLY_PAID;
    }

    private String displayMedicineName(Medicine medicine) {
        if (medicine == null) {
            return "-";
        }

        if (medicine.getMedicineName() != null && !medicine.getMedicineName().isBlank()) {
            return medicine.getMedicineName();
        }

        if (medicine.getBrandName() != null && !medicine.getBrandName().isBlank()) {
            return medicine.getBrandName();
        }

        return medicine.getId() == null ? "-" : medicine.getId();
    }

    private SalesOrderResponse decorateResponse(SalesOrderResponse response) {
        if (response == null || response.getItems() == null) {
            return response;
        }

        for (SalesItemResponse item : response.getItems()) {
            if (item.getMedicineId() != null) {
                medicineRepository.findById(item.getMedicineId())
                        .ifPresent(med -> item.setMedicineName(displayMedicineName(med)));
            }
            
            // If batchNumber/expiryDate are null in item (draft), try to fetch from batchId if allocated
            if (item.getBatchId() != null && (item.getBatchNumber() == null || item.getExpiryDate() == null)) {
                batchRepository.findById(item.getBatchId()).ifPresent(batch -> {
                    if (item.getBatchNumber() == null) item.setBatchNumber(batch.getBatchNumber());
                    if (item.getExpiryDate() == null && batch.getExpiryDate() != null) 
                        item.setExpiryDate(batch.getExpiryDate().atStartOfDay());
                });
            }
        }

        return response;
    }
}