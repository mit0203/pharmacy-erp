package com.sygnusbiotech.pharmacyerp.purchase.service;

import com.sygnusbiotech.pharmacyerp.accounting.model.EntryType;
import com.sygnusbiotech.pharmacyerp.accounting.service.LedgerEntryService;
import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import com.sygnusbiotech.pharmacyerp.inventory.model.Batch;
import com.sygnusbiotech.pharmacyerp.inventory.model.Medicine;
import com.sygnusbiotech.pharmacyerp.inventory.repository.BatchRepository;
import com.sygnusbiotech.pharmacyerp.inventory.repository.MedicineRepository;
import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseOrderRequest;
import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseOrderResponse;
import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseReturnRequest;
import com.sygnusbiotech.pharmacyerp.purchase.mapper.PurchaseOrderMapper;
import com.sygnusbiotech.pharmacyerp.purchase.model.PaymentStatus;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseItem;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrder;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrderStatus;
import com.sygnusbiotech.pharmacyerp.purchase.repository.PurchaseOrderRepository;
import com.sygnusbiotech.pharmacyerp.sales.service.InvoicePdfGenerator;
import com.sygnusbiotech.pharmacyerp.settings.model.AppSettings;
import com.sygnusbiotech.pharmacyerp.settings.repository.AppSettingsRepository;
import com.sygnusbiotech.pharmacyerp.supplier.model.Supplier;
import com.sygnusbiotech.pharmacyerp.supplier.model.SupplierStatus;
import com.sygnusbiotech.pharmacyerp.supplier.repository.SupplierRepository;
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
import java.util.Locale;
import java.util.List;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private static final Logger log = LoggerFactory.getLogger(PurchaseOrderService.class);

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final SupplierRepository supplierRepository;
    private final MedicineRepository medicineRepository;
    private final BatchRepository batchRepository;
    private final LedgerEntryService ledgerEntryService;
    private final AppSettingsRepository appSettingsRepository;

    private static final String ACCOUNT_PURCHASE = "PURCHASE";
    private static final String ACCOUNT_AP = "AP";
    private static final String ACCOUNT_CASH = "CASH";
    private static final String REFERENCE_TYPE = "PURCHASE_ORDER";

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy hh:mm a");

    @Transactional
    public PurchaseOrderResponse createPurchaseOrder(PurchaseOrderRequest request) {
        validateSupplier(request.getSupplierId());

        PurchaseOrder order = purchaseOrderMapper.toEntity(request);
        order.setOrderNumber("PO-" + System.currentTimeMillis());
        order.setOrderDate(LocalDateTime.now());
        order.setStatus(PurchaseOrderStatus.DRAFT);
        order.setPaymentStatus(PaymentStatus.UNPAID);

        calculateTotals(order);

        order.setAmountPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        order.setAmountDue(resolvePayableTotal(order)
                .setScale(2, RoundingMode.HALF_UP));

        order = purchaseOrderRepository.save(order);
        return purchaseOrderMapper.toResponse(order);
    }

    @Transactional
    public PurchaseOrderResponse updatePurchaseOrder(String id, PurchaseOrderRequest request) {
        PurchaseOrder order = getOrderById(id);

        if (order.getStatus() == PurchaseOrderStatus.RECEIVED || order.getStatus() == PurchaseOrderStatus.CANCELLED) {
            throw new BusinessException("Cannot edit a purchase order in RECEIVED or CANCELLED status", HttpStatus.BAD_REQUEST);
        }

        if (order.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new BusinessException("Only DRAFT purchase orders can be freely updated", HttpStatus.BAD_REQUEST);
        }

        validateSupplier(request.getSupplierId());

        purchaseOrderMapper.updateEntityFromRequest(request, order);
        calculateTotals(order);

        order = purchaseOrderRepository.save(order);
        return purchaseOrderMapper.toResponse(order);
    }

    public PurchaseOrderResponse getPurchaseOrderById(String id) {
        return purchaseOrderMapper.toResponse(getOrderById(id));
    }

    public Page<PurchaseOrderResponse> getAllPurchaseOrders(String search, Pageable pageable) {
        Page<PurchaseOrder> orders;
        if (search != null && !search.trim().isEmpty()) {
            orders = purchaseOrderRepository.searchActiveOrders(search, pageable);
        } else {
            orders = purchaseOrderRepository.findByIsDeletedFalse(pageable);
        }
        return orders.map(purchaseOrderMapper::toResponse);
    }

@Transactional
    public void deletePurchaseOrder(String id) {
        PurchaseOrder order = getOrderById(id);

        if (order.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new BusinessException(
                    "Only DRAFT purchase orders can be deleted",
                    HttpStatus.BAD_REQUEST
            );
        }

        order.setDeleted(true);
        purchaseOrderRepository.save(order);
    }

    @Transactional
    public PurchaseOrderResponse approvePurchaseOrder(String id) {
        PurchaseOrder order = getOrderById(id);

        if (order.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new BusinessException("Only DRAFT orders can be approved", HttpStatus.BAD_REQUEST);
        }

        order.setStatus(PurchaseOrderStatus.APPROVED);
        return purchaseOrderMapper.toResponse(purchaseOrderRepository.save(order));
    }

@Transactional
    public PurchaseOrderResponse receivePurchaseOrder(String id) {
        PurchaseOrder order = getOrderById(id);

        if (order.getStatus() != PurchaseOrderStatus.APPROVED) {
            throw new BusinessException(
                    "Only APPROVED purchase orders can be received",
                    HttpStatus.BAD_REQUEST
            );
        }

        createReceivedBatchesAndIncreaseStock(order);

        order.setStatus(PurchaseOrderStatus.RECEIVED);
        order = purchaseOrderRepository.save(order);

        postPurchaseEntry(order);

        return purchaseOrderMapper.toResponse(order);
    }

    @Transactional
    public PurchaseOrderResponse returnPurchaseOrder(String id, PurchaseReturnRequest request) {
        PurchaseOrder order = getOrderById(id);

        if (order.getStatus() != PurchaseOrderStatus.RECEIVED) {
            throw new BusinessException("Only RECEIVED purchase orders can be returned", HttpStatus.BAD_REQUEST);
        }

        if (order.getTotalAmount() == null || order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("This purchase order is already fully returned", HttpStatus.BAD_REQUEST);
        }

        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            throw new BusinessException("At least one return item is required", HttpStatus.BAD_REQUEST);
        }

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new BusinessException("Purchase order has no items to return", HttpStatus.BAD_REQUEST);
        }

        Set<String> medicineIdsInRequest = new HashSet<>();
        for (PurchaseReturnRequest.PurchaseReturnItemRequest item : request.getItems()) {
            if (item.getMedicineId() == null || item.getMedicineId().isBlank()) {
                throw new BusinessException("Medicine ID is required for return item", HttpStatus.BAD_REQUEST);
            }

            if (!medicineIdsInRequest.add(item.getMedicineId())) {
                throw new BusinessException("Duplicate medicine found in return request: " + item.getMedicineId(), HttpStatus.BAD_REQUEST);
            }
        }

        BigDecimal totalReturnAmount = BigDecimal.ZERO;
        BigDecimal totalReturnGstAmount = BigDecimal.ZERO;

        for (PurchaseReturnRequest.PurchaseReturnItemRequest returnItem : request.getItems()) {
            if (returnItem.getQuantity() == null || returnItem.getQuantity() <= 0) {
                throw new BusinessException("Return quantity must be greater than 0", HttpStatus.BAD_REQUEST);
            }

            PurchaseItem originalItem = order.getItems()
                    .stream()
                    .filter(item -> item.getMedicineId() != null &&
                            item.getMedicineId().equals(returnItem.getMedicineId()))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(
                            "Medicine not found in this purchase order: " + returnItem.getMedicineId(),
                            HttpStatus.BAD_REQUEST
                    ));

            int availableReturnQty = originalItem.getQuantity() == null ? 0 : originalItem.getQuantity();

            if (availableReturnQty <= 0) {
                throw new BusinessException(
                        "This item is already fully returned: " + returnItem.getMedicineId(),
                        HttpStatus.BAD_REQUEST
                );
            }

            if (returnItem.getQuantity() > availableReturnQty) {
                throw new BusinessException(
                        "Return quantity cannot be greater than available return quantity for medicine: " + returnItem.getMedicineId(),
                        HttpStatus.BAD_REQUEST
                );
            }

            Medicine medicine = medicineRepository.findByIdAndIsDeletedFalse(returnItem.getMedicineId())
                    .orElseThrow(() -> new BusinessException(
                            "Medicine not found: " + returnItem.getMedicineId(),
                            HttpStatus.NOT_FOUND
                    ));

            int currentMedicineStock = medicine.getStockQuantity() == null ? 0 : medicine.getStockQuantity();

            if (currentMedicineStock < returnItem.getQuantity()) {
                throw new BusinessException(
                        "Not enough medicine stock available to return: " + returnItem.getMedicineId(),
                        HttpStatus.BAD_REQUEST
                );
            }

            BigDecimal unitPrice = originalItem.getUnitPrice() == null
                    ? BigDecimal.ZERO
                    : originalItem.getUnitPrice();

            BigDecimal gstPercentage = originalItem.getGstPercentage() == null
                    ? BigDecimal.ZERO
                    : originalItem.getGstPercentage();

            BigDecimal baseReturnAmount = unitPrice
                    .multiply(BigDecimal.valueOf(returnItem.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal returnGstAmount = baseReturnAmount
                    .multiply(gstPercentage)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            BigDecimal lineReturnTotal = baseReturnAmount
                    .add(returnGstAmount)
                    .setScale(2, RoundingMode.HALF_UP);

            reducePurchaseBatchesForReturn(order, returnItem.getMedicineId(), returnItem.getQuantity());

            medicine.setStockQuantity(currentMedicineStock - returnItem.getQuantity());
            medicineRepository.save(medicine);

            int remainingQuantity = availableReturnQty - returnItem.getQuantity();
            originalItem.setQuantity(Math.max(remainingQuantity, 0));

            BigDecimal remainingBaseTotal = unitPrice
                    .multiply(BigDecimal.valueOf(originalItem.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal remainingGstAmount = remainingBaseTotal
                    .multiply(gstPercentage)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            originalItem.setGstAmount(remainingGstAmount);
            originalItem.setLineTotal(remainingBaseTotal.add(remainingGstAmount).setScale(2, RoundingMode.HALF_UP));

            totalReturnAmount = totalReturnAmount.add(lineReturnTotal);
            totalReturnGstAmount = totalReturnGstAmount.add(returnGstAmount);
        }

        calculateTotals(order);

        BigDecimal newTotal = order.getTotalAmount() == null
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : order.getTotalAmount().setScale(2, RoundingMode.HALF_UP);

        BigDecimal amountPaid = order.getAmountPaid() == null
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : order.getAmountPaid().setScale(2, RoundingMode.HALF_UP);

        if (amountPaid.compareTo(newTotal) > 0) {
            amountPaid = newTotal;
        }

        BigDecimal amountDue = newTotal.subtract(amountPaid).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        order.setAmountPaid(amountPaid.setScale(2, RoundingMode.HALF_UP));
        order.setAmountDue(amountDue);

        if (newTotal.compareTo(BigDecimal.ZERO) <= 0) {
            order.setTotalAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            order.setTotalGstAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            order.setAmountPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            order.setAmountDue(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            order.setPaymentStatus(PaymentStatus.PAID);
        } else if (amountPaid.compareTo(BigDecimal.ZERO) <= 0) {
            order.setPaymentStatus(PaymentStatus.UNPAID);
        } else if (amountPaid.compareTo(newTotal) >= 0) {
            order.setPaymentStatus(PaymentStatus.PAID);
        } else {
            order.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
        }

        String reason = request.getReason() == null || request.getReason().isBlank()
                ? "No reason provided"
                : request.getReason().trim();

        String oldNotes = order.getNotes() == null || order.getNotes().isBlank()
                ? ""
                : order.getNotes() + "\n";

        order.setNotes(oldNotes +
                "Purchase Return [" + LocalDateTime.now().format(DATE_TIME_FORMATTER) + "]: " +
                reason +
                " | Return Amount: " + totalReturnAmount.setScale(2, RoundingMode.HALF_UP) +
                " | Return GST: " + totalReturnGstAmount.setScale(2, RoundingMode.HALF_UP));

        PurchaseOrder saved = purchaseOrderRepository.save(order);

        log.info("Purchase return completed for {}. Return amount: {}",
                saved.getOrderNumber(),
                totalReturnAmount);

        return purchaseOrderMapper.toResponse(saved);
    }

    @Transactional
    public PurchaseOrderResponse generateInvoice(String id) {
        PurchaseOrder order = getOrderById(id);

        if (order.getStatus() != PurchaseOrderStatus.RECEIVED) {
            throw new BusinessException("Invoice can only be generated after the order is RECEIVED", HttpStatus.BAD_REQUEST);
        }

        if (order.getInvoiceNumber() != null) {
            throw new BusinessException("Invoice has already been generated for this order", HttpStatus.CONFLICT);
        }

        String generatedInvoiceNumber = "INV-" + order.getId() + "-" + System.currentTimeMillis();

        if (purchaseOrderRepository.existsByInvoiceNumberAndIsDeletedFalse(generatedInvoiceNumber)) {
            throw new BusinessException("Invoice number conflict, please try again", HttpStatus.CONFLICT);
        }

        order.setInvoiceNumber(generatedInvoiceNumber);
        order.setInvoiceDate(LocalDateTime.now());

        return purchaseOrderMapper.toResponse(purchaseOrderRepository.save(order));
    }

@Transactional
    public PurchaseOrderResponse updatePaymentStatus(String id, PaymentStatus newStatus, BigDecimal inputAmount) {
        PurchaseOrder order = getOrderById(id);

        if (order.getInvoiceNumber() == null || order.getInvoiceNumber().isBlank()) {
            throw new BusinessException("Payment can only be updated after invoice is generated", HttpStatus.BAD_REQUEST);
        }

        if (newStatus == null) {
            throw new BusinessException("Payment status is required", HttpStatus.BAD_REQUEST);
        }

        PaymentStatus previousStatus = order.getPaymentStatus();
        BigDecimal totalAmount = order.getTotalAmount() != null
                ? order.getTotalAmount().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal payableTotal = resolvePayableTotal(order);

        BigDecimal existingPaid = order.getAmountPaid() != null
                ? order.getAmountPaid().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            order.setAmountPaid(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            order.setAmountDue(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            order.setPaymentStatus(PaymentStatus.PAID);
            return purchaseOrderMapper.toResponse(purchaseOrderRepository.save(order));
        }

        BigDecimal newPaid;

        if (newStatus == PaymentStatus.PAID) {
            newPaid = payableTotal;
        } else if (newStatus == PaymentStatus.PARTIALLY_PAID) {
            if (inputAmount == null || inputAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("Partial amount must be greater than 0", HttpStatus.BAD_REQUEST);
            }

            BigDecimal requestedPaid = inputAmount.setScale(2, RoundingMode.HALF_UP);

            if (requestedPaid.compareTo(payableTotal) >= 0) {
                throw new BusinessException("Partial amount must be less than total amount. Use PAID for full payment.", HttpStatus.BAD_REQUEST);
            }

            if (requestedPaid.compareTo(existingPaid) < 0) {
                throw new BusinessException("Cannot reduce already paid amount", HttpStatus.BAD_REQUEST);
            }

            newPaid = requestedPaid;
        } else if (newStatus == PaymentStatus.UNPAID) {
            if (existingPaid.compareTo(BigDecimal.ZERO) > 0) {
                throw new BusinessException("Cannot mark unpaid after payment has been made", HttpStatus.BAD_REQUEST);
            }

            newPaid = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        } else {
            throw new BusinessException("Invalid payment status", HttpStatus.BAD_REQUEST);
        }

        order.setAmountPaid(newPaid.setScale(2, RoundingMode.HALF_UP));
        order.setAmountDue(payableTotal.subtract(order.getAmountPaid()).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));

        if (order.getAmountPaid().compareTo(BigDecimal.ZERO) <= 0) {
            order.setPaymentStatus(PaymentStatus.UNPAID);
        } else if (order.getAmountPaid().compareTo(payableTotal) >= 0) {
            order.setPaymentStatus(PaymentStatus.PAID);
        } else {
            order.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
        }

        PurchaseOrder saved = purchaseOrderRepository.save(order);

        if (saved.getPaymentStatus() == PaymentStatus.PAID && previousStatus != PaymentStatus.PAID) {
            postPurchasePaymentEntry(saved);
        }

        return purchaseOrderMapper.toResponse(saved);
    }

    public byte[] generateInvoicePdf(String id) {
        PurchaseOrder order = getOrderById(id);

        if (order.getInvoiceNumber() == null || order.getInvoiceNumber().isBlank()) {
            throw new BusinessException("Invoice not generated yet", HttpStatus.BAD_REQUEST);
        }

        Supplier supplier = supplierRepository.findByIdAndDeletedFalse(order.getSupplierId())
                .orElseThrow(() -> new BusinessException("Supplier not found", HttpStatus.NOT_FOUND));

        AppSettings settings = appSettingsRepository.findAll().stream().findFirst().orElse(new AppSettings());
        AppSettings.Business biz = settings.getBusiness() != null ? settings.getBusiness() : new AppSettings.Business();
        AppSettings.Invoices inv = settings.getInvoices() != null ? settings.getInvoices() : new AppSettings.Invoices();

        InvoicePdfGenerator.InvoiceData d = new InvoicePdfGenerator.InvoiceData();
        d.title = "TAX INVOICE";
        d.subtitle = "PURCHASE INVOICE";
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

        d.partyLabel = "Bill From / Supplier";
        d.partyName = supplier.getName();
        d.partyAddress = supplier.getAddress();
        d.partyPhone = supplier.getPhone();
        d.partyEmail = supplier.getEmail();
        d.partyGstin = supplier.getGstNumber();
        d.partyDl = supplier.getDlNumber();
        d.partyState = supplier.getState();
        d.partyStateCode = supplier.getStateCode();

        d.invoiceNumber = order.getInvoiceNumber();
        d.supplierInvoiceNumber = order.getSupplierInvoiceNumber();
        d.orderNumber = order.getOrderNumber();
        d.invoiceDate = order.getInvoiceDate();
        d.orderDate = order.getOrderDate();
        d.dueDate = order.getDueDate();
        d.lrNumber = order.getLrNumber();
        d.transport = order.getTransport();
        d.placeOfSupply = order.getPlaceOfSupply();
        d.reverseCharge = order.isReverseCharge();
        d.paymentStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().name() : "-";

        List<PurchaseItem> items = order.getItems() != null ? order.getItems() : List.of();
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
            PurchaseItem it = items.get(i);
            Medicine med = null;
            try { med = medicineRepository.findByIdAndIsDeletedFalse(it.getMedicineId()).orElse(null); } catch (Exception ignored) {}
            Batch batch = null;
            if (it.getBatchNumber() != null && !it.getBatchNumber().isBlank()) {
                try {
                    batch = batchRepository.findByBatchNumberAndMedicineIdAndIsDeletedFalse(it.getBatchNumber(), it.getMedicineId()).orElse(null);
                } catch (Exception ignored) {}
            }
            
            String medName = it.getMedicineId();
            if (med != null) {
                if (med.getMedicineName() != null && !med.getMedicineName().isBlank()) medName = med.getMedicineName();
                else if (med.getBrandName() != null && !med.getBrandName().isBlank()) medName = med.getBrandName();
            }
            d.medicineName[i] = medName;
            
            d.pack[i] = it.getPack();
            d.hsn[i] = it.getHsn();

            d.batchNumber[i] = it.getBatchNumber() != null && !it.getBatchNumber().isBlank()
                    ? it.getBatchNumber()
                    : (batch != null ? batch.getBatchNumber() : "-");
            d.mfgDate[i] = "-";
            d.expDate[i] = it.getExpiryDate() != null && !it.getExpiryDate().isBlank()
                    ? it.getExpiryDate()
                    : (batch != null && batch.getExpiryDate() != null ? batch.getExpiryDate().toString() : "-");

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

    private void validateSupplier(String supplierId) {
        Supplier supplier = supplierRepository.findByIdAndDeletedFalse(supplierId)
                .orElseThrow(() -> new BusinessException("Supplier not found", HttpStatus.NOT_FOUND));

        if (supplier.getStatus() != SupplierStatus.ACTIVE) {
            throw new BusinessException("Supplier is not active", HttpStatus.BAD_REQUEST);
        }
    }

    private void calculateTotals(PurchaseOrder order) {
        BigDecimal totalAmt = BigDecimal.ZERO;
        BigDecimal totalGstAmt = BigDecimal.ZERO;
        BigDecimal totalTaxable = BigDecimal.ZERO;
        BigDecimal totalCgst = BigDecimal.ZERO;
        BigDecimal totalSgst = BigDecimal.ZERO;
        BigDecimal totalIgst = BigDecimal.ZERO;

        boolean isInterState = isInterStateSupply(order);

        if (order.getItems() != null) {
            for (PurchaseItem item : order.getItems()) {
                medicineRepository.findByIdAndIsDeletedFalse(item.getMedicineId())
                        .orElseThrow(() -> new BusinessException("Medicine not found for ID: " + item.getMedicineId(), HttpStatus.NOT_FOUND));

                int qtyValue = item.getQuantity() == null ? 0 : item.getQuantity();
                int freeQtyValue = item.getFreeQuantity() == null ? 0 : item.getFreeQuantity();
                BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal mrp = item.getMrp() != null ? item.getMrp() : BigDecimal.ZERO;
                BigDecimal discountPct = item.getDiscountPercent() != null ? item.getDiscountPercent() : BigDecimal.ZERO;
                BigDecimal gstPct = item.getGstPercentage() != null ? item.getGstPercentage() : BigDecimal.ZERO;

                if (qtyValue <= 0) {
                    throw new BusinessException("Purchase quantity must be greater than 0", HttpStatus.BAD_REQUEST);
                }
                if (freeQtyValue < 0) {
                    throw new BusinessException("Free quantity cannot be negative", HttpStatus.BAD_REQUEST);
                }
                if (unitPrice.compareTo(BigDecimal.ZERO) < 0) {
                    throw new BusinessException("Unit price cannot be negative", HttpStatus.BAD_REQUEST);
                }
                if (mrp.compareTo(BigDecimal.ZERO) < 0) {
                    throw new BusinessException("MRP cannot be negative", HttpStatus.BAD_REQUEST);
                }
                if (discountPct.compareTo(BigDecimal.ZERO) < 0) {
                    throw new BusinessException("Discount percentage cannot be negative", HttpStatus.BAD_REQUEST);
                }
                if (gstPct.compareTo(BigDecimal.ZERO) < 0) {
                    throw new BusinessException("GST percentage cannot be negative", HttpStatus.BAD_REQUEST);
                }

                BigDecimal qty = BigDecimal.valueOf(qtyValue);
                BigDecimal itemBaseTotal = unitPrice.multiply(qty);
                
                BigDecimal discountAmt = itemBaseTotal.multiply(discountPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                BigDecimal taxableValue = itemBaseTotal.subtract(discountAmt).setScale(2, RoundingMode.HALF_UP);

                BigDecimal itemGstTotal = taxableValue.multiply(gstPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

                BigDecimal lineTotal = taxableValue.add(itemGstTotal).setScale(2, RoundingMode.HALF_UP);

                BigDecimal cgstPct = BigDecimal.ZERO, cgstAmt = BigDecimal.ZERO;
                BigDecimal sgstPct = BigDecimal.ZERO, sgstAmt = BigDecimal.ZERO;
                BigDecimal igstPct = BigDecimal.ZERO, igstAmt = BigDecimal.ZERO;

                if (isInterState) {
                    igstPct = gstPct;
                    igstAmt = itemGstTotal;
                } else {
                    BigDecimal halfGst = gstPct.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                    cgstPct = halfGst;
                    sgstPct = halfGst;
                    cgstAmt = itemGstTotal.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                    sgstAmt = itemGstTotal.subtract(cgstAmt);
                }

                item.setTaxableValue(taxableValue);
                item.setGstAmount(itemGstTotal);
                item.setCgstPercent(cgstPct);
                item.setCgstAmount(cgstAmt);
                item.setSgstPercent(sgstPct);
                item.setSgstAmount(sgstAmt);
                item.setIgstPercent(igstPct);
                item.setIgstAmount(igstAmt);
                item.setLineTotal(lineTotal);

                totalAmt = totalAmt.add(lineTotal);
                totalGstAmt = totalGstAmt.add(itemGstTotal);
                totalTaxable = totalTaxable.add(taxableValue);
                totalCgst = totalCgst.add(cgstAmt);
                totalSgst = totalSgst.add(sgstAmt);
                totalIgst = totalIgst.add(igstAmt);
            }
        }

        order.setTotalAmount(totalAmt.setScale(2, RoundingMode.HALF_UP));
        order.setTotalGstAmount(totalGstAmt.setScale(2, RoundingMode.HALF_UP));
        order.setTotalTaxableAmount(totalTaxable.setScale(2, RoundingMode.HALF_UP));
        order.setTotalCgst(totalCgst.setScale(2, RoundingMode.HALF_UP));
        order.setTotalSgst(totalSgst.setScale(2, RoundingMode.HALF_UP));
        order.setTotalIgst(totalIgst.setScale(2, RoundingMode.HALF_UP));
        
        BigDecimal grandTotal = totalAmt.setScale(0, RoundingMode.HALF_UP);
        BigDecimal roundOff = grandTotal.subtract(totalAmt).setScale(2, RoundingMode.HALF_UP);
        
        order.setRoundOff(roundOff);
        order.setGrandTotal(grandTotal);

        BigDecimal paid = order.getAmountPaid() == null ? BigDecimal.ZERO : order.getAmountPaid();
        BigDecimal payableTotal = resolvePayableTotal(order);
        if (paid.compareTo(payableTotal) > 0) {
            paid = payableTotal;
        }

        order.setAmountPaid(paid.setScale(2, RoundingMode.HALF_UP));
        order.setAmountDue(payableTotal.subtract(order.getAmountPaid()).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
        order.setPaymentStatus(resolvePaymentStatus(order.getAmountPaid(), payableTotal));
    }

    private PurchaseOrder getOrderById(String id) {
        return purchaseOrderRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Purchase order not found", HttpStatus.NOT_FOUND));
    }

    private void createReceivedBatchesAndIncreaseStock(PurchaseOrder order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new BusinessException("Cannot receive purchase order without items", HttpStatus.BAD_REQUEST);
        }

        Supplier supplier = supplierRepository.findByIdAndDeletedFalse(order.getSupplierId())
                .orElseThrow(() -> new BusinessException("Supplier not found", HttpStatus.NOT_FOUND));

        int index = 1;

        for (PurchaseItem item : order.getItems()) {
            if (item.getMedicineId() == null || item.getMedicineId().isBlank()) {
                throw new BusinessException("Medicine is required in purchase item", HttpStatus.BAD_REQUEST);
            }

            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new BusinessException("Purchase quantity must be greater than 0", HttpStatus.BAD_REQUEST);
            }

            Medicine medicine = medicineRepository.findByIdAndIsDeletedFalse(item.getMedicineId())
                    .orElseThrow(() -> new BusinessException(
                            "Medicine not found: " + item.getMedicineId(),
                            HttpStatus.NOT_FOUND
                    ));

            int freeQty = item.getFreeQuantity() == null ? 0 : item.getFreeQuantity();
            if (freeQty < 0) {
                throw new BusinessException("Free quantity cannot be negative", HttpStatus.BAD_REQUEST);
            }
            int receivedQty = item.getQuantity() + freeQty;

            String batchNumber = (item.getBatchNumber() != null && !item.getBatchNumber().isBlank())
                    ? item.getBatchNumber().trim()
                    : order.getOrderNumber() + "-B" + index;

            BigDecimal purchasePrice = item.getUnitPrice() == null
                    ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                    : item.getUnitPrice().setScale(2, RoundingMode.HALF_UP);

            LocalDate expiryDate = parseExpiryDateOrFallback(item.getExpiryDate());

            Batch existingBatch = batchRepository.findByBatchNumberAndMedicineIdAndIsDeletedFalse(batchNumber, item.getMedicineId())
                    .orElse(null);

            if (existingBatch != null) {
                int existingQty = existingBatch.getQuantity() == null ? 0 : existingBatch.getQuantity();
                existingBatch.setQuantity(existingQty + receivedQty);
                existingBatch.setPurchasePrice(purchasePrice);
                if (existingBatch.getExpiryDate() == null || existingBatch.getExpiryDate().equals(expiryDate)) {
                    existingBatch.setExpiryDate(expiryDate);
                } else {
                    throw new BusinessException(
                            "Existing batch expiry conflict for medicine " + medicine.getMedicineName()
                                    + " and batch " + batchNumber
                                    + ". Existing expiry: " + existingBatch.getExpiryDate()
                                    + ", received expiry: " + expiryDate,
                            HttpStatus.BAD_REQUEST
                    );
                }
                batchRepository.save(existingBatch);
            } else {
                Batch batch = Batch.builder()
                        .medicineId(item.getMedicineId())
                        .batchNumber(batchNumber)
                        .manufacturingDate(LocalDate.now())
                        .expiryDate(expiryDate)
                        .quantity(receivedQty)
                        .purchasePrice(purchasePrice)
                        .supplierName(supplier.getName())
                        .invoiceReference(order.getOrderNumber())
                        .isDeleted(false)
                        .build();

                batchRepository.save(batch);
            }

            int currentStock = medicine.getStockQuantity() == null ? 0 : medicine.getStockQuantity();
            medicine.setStockQuantity(currentStock + receivedQty);
            medicine.setPurchasePrice(purchasePrice);
            medicineRepository.save(medicine);

            index++;
        }

        log.info("Created stock batches and increased medicine stock for Purchase Order: {}", order.getOrderNumber());
    }

private void reducePurchaseBatchesForReturn(PurchaseOrder order, String medicineId, int returnQuantity) {
        if (returnQuantity <= 0) {
            throw new BusinessException("Return quantity must be greater than 0", HttpStatus.BAD_REQUEST);
        }

        int remainingToReturn = returnQuantity;
        List<Batch> allBatches = batchRepository.findAll();

        for (Batch batch : allBatches) {
            if (remainingToReturn <= 0) {
                break;
            }

            if (batch.getMedicineId() == null || !batch.getMedicineId().equals(medicineId)) {
                continue;
            }

            if (batch.isDeleted()) {
                continue;
            }

            String batchReference = batch.getInvoiceReference();

            boolean matchesThisPurchase = batchReference != null
                    && batchReference.equals(order.getOrderNumber());

            if (!matchesThisPurchase) {
                continue;
            }

            int batchQty = batch.getQuantity() == null ? 0 : batch.getQuantity();

            if (batchQty <= 0) {
                continue;
            }

            int reduceQty = Math.min(batchQty, remainingToReturn);

            batch.setQuantity(batchQty - reduceQty);
            batchRepository.save(batch);

            remainingToReturn -= reduceQty;
        }

        if (remainingToReturn > 0) {
            throw new BusinessException(
                    "Return blocked: stock from this purchase batch is not enough. Cannot reduce stock from other purchase batches.",
                    HttpStatus.BAD_REQUEST
            );
        }
    }

    private void postPurchaseEntry(PurchaseOrder order) {
        try {
            ledgerEntryService.createEntryFromEvent(
                    REFERENCE_TYPE,
                    order.getOrderNumber(),
                    "Purchase received: " + order.getOrderNumber(),
                    ACCOUNT_PURCHASE,
                    ACCOUNT_AP,
                    order.getTotalAmount(),
                    EntryType.PURCHASE
            );
            log.info("Accounting: PURCHASE entry posted for {}", order.getOrderNumber());
        } catch (Exception e) {
            log.error("Accounting: Failed to post PURCHASE entry for {} — {}", order.getOrderNumber(), e.getMessage());
        }
    }

    private void postPurchasePaymentEntry(PurchaseOrder order) {
        try {
            ledgerEntryService.createEntryFromEvent(
                    REFERENCE_TYPE,
                    order.getOrderNumber(),
                    "Payment for purchase: " + order.getOrderNumber(),
                    ACCOUNT_AP,
                    ACCOUNT_CASH,
                    order.getTotalAmount(),
                    EntryType.PURCHASE_PAYMENT
            );
            log.info("Accounting: PURCHASE_PAYMENT entry posted for {}", order.getOrderNumber());
        } catch (Exception e) {
            log.error("Accounting: Failed to post PURCHASE_PAYMENT entry for {} — {}", order.getOrderNumber(), e.getMessage());
        }
    }

    private LocalDate parseExpiryDateOrFallback(String rawExpiryDate) {
        LocalDate fallback = LocalDate.now().plusYears(2);
        if (rawExpiryDate == null || rawExpiryDate.isBlank()) {
            return fallback;
        }
        String value = rawExpiryDate.trim();
        try {
            if (value.matches("\\d{4}-\\d{2}-\\d{2}")) {
                return LocalDate.parse(value);
            }
            if (value.matches("\\d{2}/\\d{2}/\\d{4}")) {
                return LocalDate.parse(value, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }
            if (value.matches("\\d{2}/\\d{4}")) {
                return LocalDate.parse("01/" + value, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }
        } catch (Exception e) {
            log.warn("Failed to parse expiry date {}, defaulting to fallback", rawExpiryDate);
        }
        return fallback;
    }

    private BigDecimal resolvePayableTotal(PurchaseOrder order) {
        if (order == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal payable = order.getGrandTotal() != null ? order.getGrandTotal() : order.getTotalAmount();
        if (payable == null) {
            payable = BigDecimal.ZERO;
        }
        return payable.setScale(2, RoundingMode.HALF_UP);
    }

    private PaymentStatus resolvePaymentStatus(BigDecimal amountPaid, BigDecimal payableTotal) {
        BigDecimal paid = amountPaid == null ? BigDecimal.ZERO : amountPaid.setScale(2, RoundingMode.HALF_UP);
        BigDecimal payable = payableTotal == null ? BigDecimal.ZERO : payableTotal.setScale(2, RoundingMode.HALF_UP);
        if (payable.compareTo(BigDecimal.ZERO) <= 0) {
            return PaymentStatus.PAID;
        }
        if (paid.compareTo(BigDecimal.ZERO) <= 0) {
            return PaymentStatus.UNPAID;
        }
        if (paid.compareTo(payable) >= 0) {
            return PaymentStatus.PAID;
        }
        return PaymentStatus.PARTIALLY_PAID;
    }

    private boolean isInterStateSupply(PurchaseOrder order) {
        if (order == null || order.getSupplierId() == null || order.getSupplierId().isBlank()) {
            return false;
        }
        Supplier supplier = supplierRepository.findByIdAndDeletedFalse(order.getSupplierId()).orElse(null);
        if (supplier == null) {
            return false;
        }

        AppSettings settings = appSettingsRepository.findAll().stream().findFirst().orElse(new AppSettings());
        AppSettings.Business business = settings.getBusiness() != null ? settings.getBusiness() : new AppSettings.Business();

        String companyStateCode = normalizeStateCode(business.getStateCode());
        String companyState = normalizeStateName(business.getState());

        String supplyStateCode = normalizeStateCode(supplier.getStateCode());
        String supplyState = normalizeStateName(supplier.getState());

        if (order.getPlaceOfSupply() != null && !order.getPlaceOfSupply().isBlank()) {
            String place = order.getPlaceOfSupply().trim();
            if (isNumericStateCode(place)) {
                supplyStateCode = normalizeStateCode(place);
            } else {
                supplyState = normalizeStateName(place);
            }
        }

        if (companyStateCode != null && supplyStateCode != null) {
            return !companyStateCode.equals(supplyStateCode);
        }
        if (companyState != null && supplyState != null) {
            return !companyState.equals(supplyState);
        }
        return false;
    }

    private String normalizeStateCode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeStateName(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isNumericStateCode(String value) {
        return value != null && value.trim().matches("\\d{1,2}");
    }

}