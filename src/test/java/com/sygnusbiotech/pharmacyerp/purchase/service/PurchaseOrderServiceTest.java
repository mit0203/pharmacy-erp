package com.sygnusbiotech.pharmacyerp.purchase.service;

import com.sygnusbiotech.pharmacyerp.accounting.service.LedgerEntryService;
import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import com.sygnusbiotech.pharmacyerp.inventory.model.Batch;
import com.sygnusbiotech.pharmacyerp.inventory.model.Medicine;
import com.sygnusbiotech.pharmacyerp.inventory.repository.BatchRepository;
import com.sygnusbiotech.pharmacyerp.inventory.repository.MedicineRepository;
import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseItemRequest;
import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseOrderRequest;
import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseOrderResponse;
import com.sygnusbiotech.pharmacyerp.purchase.mapper.PurchaseOrderMapper;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseItem;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrder;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrderStatus;
import com.sygnusbiotech.pharmacyerp.purchase.repository.PurchaseOrderRepository;
import com.sygnusbiotech.pharmacyerp.settings.model.AppSettings;
import com.sygnusbiotech.pharmacyerp.settings.repository.AppSettingsRepository;
import com.sygnusbiotech.pharmacyerp.supplier.model.Supplier;
import com.sygnusbiotech.pharmacyerp.supplier.model.SupplierStatus;
import com.sygnusbiotech.pharmacyerp.supplier.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderServiceTest {

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private PurchaseOrderMapper purchaseOrderMapper;
    @Mock
    private SupplierRepository supplierRepository;
    @Mock
    private MedicineRepository medicineRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private LedgerEntryService ledgerEntryService;
    @Mock
    private AppSettingsRepository appSettingsRepository;

    private PurchaseOrderService service;

    @BeforeEach
    void setUp() {
        service = new PurchaseOrderService(
                purchaseOrderRepository,
                purchaseOrderMapper,
                supplierRepository,
                medicineRepository,
                batchRepository,
                ledgerEntryService,
                appSettingsRepository
        );

        org.mockito.Mockito.lenient().when(purchaseOrderRepository.save(any(PurchaseOrder.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        org.mockito.Mockito.lenient().when(purchaseOrderMapper.toResponse(any(PurchaseOrder.class)))
                .thenAnswer(invocation -> {
                    PurchaseOrder order = invocation.getArgument(0);
                    PurchaseOrderResponse response = new PurchaseOrderResponse();
                    response.setId(order.getId());
                    response.setOrderNumber(order.getOrderNumber());
                    response.setGrandTotal(order.getGrandTotal());
                    response.setAmountDue(order.getAmountDue());
                    response.setItems(List.of());
                    return response;
                });
    }

    @Test
    void createPurchaseOrder_calculatesExpectedAmountsAndGrandTotalDue() {
        PurchaseOrderRequest request = baseRequest("MH", "MH");
        request.setPlaceOfSupply("27");

        PurchaseOrder mappedEntity = PurchaseOrder.builder()
                .supplierId(request.getSupplierId())
                .supplierInvoiceNumber(request.getSupplierInvoiceNumber())
                .dueDate(request.getDueDate())
                .lrNumber(request.getLrNumber())
                .transport(request.getTransport())
                .placeOfSupply(request.getPlaceOfSupply())
                .reverseCharge(request.isReverseCharge())
                .termsAndConditions(request.getTermsAndConditions())
                .notes(request.getNotes())
                .items(List.of(PurchaseItem.builder()
                        .medicineId("MED-1")
                        .pack("10x10")
                        .hsn("3004")
                        .batchNumber("BATCH-101")
                        .expiryDate(LocalDate.now().plusYears(2).toString())
                        .mrp(new BigDecimal("120"))
                        .quantity(10)
                        .freeQuantity(1)
                        .unitPrice(new BigDecimal("90"))
                        .discountPercent(new BigDecimal("5"))
                        .gstPercentage(new BigDecimal("12"))
                        .build()))
                .build();

        when(purchaseOrderMapper.toEntity(request)).thenReturn(mappedEntity);
        when(supplierRepository.findByIdAndDeletedFalse("SUP-1"))
                .thenReturn(Optional.of(activeSupplier("SUP-1", "Maharashtra", "27")));
        when(medicineRepository.findByIdAndIsDeletedFalse(anyString()))
                .thenReturn(Optional.of(medicine("MED-1")));
        when(appSettingsRepository.findAll())
                .thenReturn(List.of(appSettings("Maharashtra", "27")));

        service.createPurchaseOrder(request);

        ArgumentCaptor<PurchaseOrder> orderCaptor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository).save(orderCaptor.capture());
        PurchaseOrder saved = orderCaptor.getValue();
        PurchaseItem item = saved.getItems().get(0);

        assertEquals(new BigDecimal("855.00"), item.getTaxableValue());
        assertEquals(new BigDecimal("102.60"), item.getGstAmount());
        assertEquals(new BigDecimal("957.60"), item.getLineTotal());
        assertEquals(new BigDecimal("6.00"), item.getCgstPercent());
        assertEquals(new BigDecimal("51.30"), item.getCgstAmount());
        assertEquals(new BigDecimal("6.00"), item.getSgstPercent());
        assertEquals(new BigDecimal("51.30"), item.getSgstAmount());
        assertEquals(new BigDecimal("0"), item.getIgstAmount());
        assertEquals(new BigDecimal("957.60"), saved.getTotalAmount());
        assertEquals(new BigDecimal("958"), saved.getGrandTotal());
        assertEquals(new BigDecimal("0.40"), saved.getRoundOff());
        assertEquals(new BigDecimal("958.00"), saved.getAmountDue());
    }

    @Test
    void createPurchaseOrder_splitsGstForSameState() {
        when(supplierRepository.findByIdAndDeletedFalse("SUP-1"))
                .thenReturn(Optional.of(activeSupplier("SUP-1", "Maharashtra", "27")));
        when(medicineRepository.findByIdAndIsDeletedFalse(anyString()))
                .thenReturn(Optional.of(medicine("MED-1")));
        when(appSettingsRepository.findAll())
                .thenReturn(List.of(appSettings("Maharashtra", "27")));

        PurchaseOrderRequest sameState = baseRequest("MH", "MH");
        sameState.setPlaceOfSupply("Maharashtra");
        PurchaseOrder sameStateEntity = mappedEntityWithSingleItem();
        sameStateEntity.setPlaceOfSupply("Maharashtra");
        when(purchaseOrderMapper.toEntity(sameState)).thenReturn(sameStateEntity);
        
        service.createPurchaseOrder(sameState);

        ArgumentCaptor<PurchaseOrder> captor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository).save(captor.capture());
        PurchaseItem sameStateItem = captor.getValue().getItems().get(0);
        assertEquals(0, new BigDecimal("0").compareTo(sameStateItem.getIgstAmount()));
        assertEquals(0, new BigDecimal("51.30").compareTo(sameStateItem.getCgstAmount()));
        assertEquals(0, new BigDecimal("51.30").compareTo(sameStateItem.getSgstAmount()));
    }

    @Test
    void createPurchaseOrder_splitsGstForInterstate() {
        when(supplierRepository.findByIdAndDeletedFalse("SUP-2"))
                .thenReturn(Optional.of(activeSupplier("SUP-2", "Karnataka", "29")));
        when(medicineRepository.findByIdAndIsDeletedFalse(anyString()))
                .thenReturn(Optional.of(medicine("MED-1")));
        when(appSettingsRepository.findAll())
                .thenReturn(List.of(appSettings("Maharashtra", "27")));

        PurchaseOrderRequest interstate = baseRequest("MH", "KA");
        interstate.setSupplierId("SUP-2");
        interstate.setPlaceOfSupply("29");
        PurchaseOrder interstateEntity = mappedEntityWithSingleItem();
        interstateEntity.setSupplierId("SUP-2");
        interstateEntity.setPlaceOfSupply("29");
        when(purchaseOrderMapper.toEntity(interstate)).thenReturn(interstateEntity);
        
        service.createPurchaseOrder(interstate);

        ArgumentCaptor<PurchaseOrder> captor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository).save(captor.capture());
        PurchaseItem interstateItem = captor.getValue().getItems().get(0);
        assertEquals(0, new BigDecimal("102.60").compareTo(interstateItem.getIgstAmount()));
        assertEquals(0, new BigDecimal("0").compareTo(interstateItem.getCgstAmount()));
        assertEquals(0, new BigDecimal("0").compareTo(interstateItem.getSgstAmount()));
    }

    @Test
    void receivePurchaseOrder_increasesStockAndUsesProvidedBatchAndExpiry() {
        PurchaseOrder approvedOrder = PurchaseOrder.builder()
                .id("PO-1")
                .orderNumber("PO-1001")
                .supplierId("SUP-1")
                .status(PurchaseOrderStatus.APPROVED)
                .items(List.of(PurchaseItem.builder()
                        .medicineId("MED-1")
                        .quantity(10)
                        .freeQuantity(1)
                        .unitPrice(new BigDecimal("90"))
                        .batchNumber("BATCH-101")
                        .expiryDate("2030-12-31")
                        .build()))
                .build();

        Batch existing = Batch.builder()
                .id("B1")
                .medicineId("MED-1")
                .batchNumber("BATCH-101")
                .expiryDate(LocalDate.parse("2030-12-31"))
                .quantity(5)
                .build();

        Medicine med = medicine("MED-1");
        med.setStockQuantity(20);

        when(purchaseOrderRepository.findByIdAndIsDeletedFalse("PO-1")).thenReturn(Optional.of(approvedOrder));
        when(supplierRepository.findByIdAndDeletedFalse("SUP-1"))
                .thenReturn(Optional.of(activeSupplier("SUP-1", "Maharashtra", "27")));
        when(medicineRepository.findByIdAndIsDeletedFalse("MED-1")).thenReturn(Optional.of(med));
        when(batchRepository.findByBatchNumberAndMedicineIdAndIsDeletedFalse("BATCH-101", "MED-1"))
                .thenReturn(Optional.of(existing));

        service.receivePurchaseOrder("PO-1");

        ArgumentCaptor<Batch> batchCaptor = ArgumentCaptor.forClass(Batch.class);
        verify(batchRepository).save(batchCaptor.capture());
        Batch savedBatch = batchCaptor.getValue();
        assertEquals("BATCH-101", savedBatch.getBatchNumber());
        assertEquals(LocalDate.parse("2030-12-31"), savedBatch.getExpiryDate());
        assertEquals(16, savedBatch.getQuantity()); // 5 + (10+1)

        ArgumentCaptor<Medicine> medCaptor = ArgumentCaptor.forClass(Medicine.class);
        verify(medicineRepository).save(medCaptor.capture());
        assertEquals(31, medCaptor.getValue().getStockQuantity()); // 20 + (10+1)
    }

    @Test
    void receivePurchaseOrder_throwsOnExistingBatchExpiryConflict() {
        PurchaseOrder approvedOrder = PurchaseOrder.builder()
                .id("PO-2")
                .orderNumber("PO-1002")
                .supplierId("SUP-1")
                .status(PurchaseOrderStatus.APPROVED)
                .items(List.of(PurchaseItem.builder()
                        .medicineId("MED-1")
                        .quantity(10)
                        .freeQuantity(0)
                        .unitPrice(new BigDecimal("90"))
                        .batchNumber("BATCH-101")
                        .expiryDate("2030-12-31")
                        .build()))
                .build();

        Batch existing = Batch.builder()
                .medicineId("MED-1")
                .batchNumber("BATCH-101")
                .expiryDate(LocalDate.parse("2031-12-31"))
                .quantity(5)
                .build();

        when(purchaseOrderRepository.findByIdAndIsDeletedFalse("PO-2")).thenReturn(Optional.of(approvedOrder));
        when(supplierRepository.findByIdAndDeletedFalse("SUP-1"))
                .thenReturn(Optional.of(activeSupplier("SUP-1", "Maharashtra", "27")));
        when(medicineRepository.findByIdAndIsDeletedFalse("MED-1")).thenReturn(Optional.of(medicine("MED-1")));
        when(batchRepository.findByBatchNumberAndMedicineIdAndIsDeletedFalse("BATCH-101", "MED-1"))
                .thenReturn(Optional.of(existing));

        assertThrows(BusinessException.class, () -> service.receivePurchaseOrder("PO-2"));
    }

    @Test
    void generateInvoicePdf_returnsNonEmptyPdfBytesWithMappedData() {
        PurchaseOrder order = PurchaseOrder.builder()
                .id("PO-3")
                .orderNumber("PO-1003")
                .supplierId("SUP-1")
                .invoiceNumber("INV-1")
                .supplierInvoiceNumber("SUP-001")
                .invoiceDate(LocalDateTime.now())
                .orderDate(LocalDateTime.now())
                .grandTotal(new BigDecimal("958"))
                .amountDue(new BigDecimal("958"))
                .items(List.of(PurchaseItem.builder()
                        .medicineId("MED-1")
                        .pack("10x10")
                        .hsn("3004")
                        .batchNumber("BATCH-101")
                        .expiryDate("2030-12-31")
                        .mrp(new BigDecimal("120"))
                        .quantity(10)
                        .freeQuantity(1)
                        .unitPrice(new BigDecimal("90"))
                        .discountPercent(new BigDecimal("5"))
                        .taxableValue(new BigDecimal("855.00"))
                        .gstPercentage(new BigDecimal("12"))
                        .cgstPercent(new BigDecimal("6"))
                        .cgstAmount(new BigDecimal("51.30"))
                        .sgstPercent(new BigDecimal("6"))
                        .sgstAmount(new BigDecimal("51.30"))
                        .igstPercent(BigDecimal.ZERO)
                        .igstAmount(BigDecimal.ZERO)
                        .lineTotal(new BigDecimal("957.60"))
                        .build()))
                .build();

        when(purchaseOrderRepository.findByIdAndIsDeletedFalse("PO-3")).thenReturn(Optional.of(order));
        when(supplierRepository.findByIdAndDeletedFalse("SUP-1"))
                .thenReturn(Optional.of(activeSupplier("SUP-1", "Maharashtra", "27")));
        when(appSettingsRepository.findAll()).thenReturn(List.of(appSettings("Maharashtra", "27")));
        when(medicineRepository.findByIdAndIsDeletedFalse("MED-1")).thenReturn(Optional.of(medicine("MED-1")));
        when(batchRepository.findByBatchNumberAndMedicineIdAndIsDeletedFalse("BATCH-101", "MED-1"))
                .thenReturn(Optional.of(Batch.builder()
                        .medicineId("MED-1")
                        .batchNumber("BATCH-101")
                        .expiryDate(LocalDate.parse("2030-12-31"))
                        .build()));

        byte[] pdf = service.generateInvoicePdf("PO-3");
        assertNotNull(pdf);
        assertEquals("%PDF-", new String(pdf, 0, 5));
    }

    private PurchaseOrder mappedEntityWithSingleItem() {
        return PurchaseOrder.builder()
                .supplierId("SUP-1")
                .supplierInvoiceNumber("SUP-001")
                .dueDate(LocalDateTime.now().plusDays(7))
                .lrNumber("LR-001")
                .transport("Test Transport")
                .placeOfSupply("Maharashtra")
                .reverseCharge(false)
                .termsAndConditions("Standard terms")
                .notes("Test note")
                .items(List.of(PurchaseItem.builder()
                        .medicineId("MED-1")
                        .pack("10x10")
                        .hsn("3004")
                        .batchNumber("BATCH-101")
                        .expiryDate(LocalDate.now().plusYears(2).toString())
                        .mrp(new BigDecimal("120"))
                        .quantity(10)
                        .freeQuantity(1)
                        .unitPrice(new BigDecimal("90"))
                        .discountPercent(new BigDecimal("5"))
                        .gstPercentage(new BigDecimal("12"))
                        .build()))
                .build();
    }

    private PurchaseOrderRequest baseRequest(String companyStateHint, String supplyStateHint) {
        PurchaseItemRequest item = new PurchaseItemRequest();
        item.setMedicineId("MED-1");
        item.setPack("10x10");
        item.setHsn("3004");
        item.setBatchNumber("BATCH-101");
        item.setExpiryDate(LocalDate.now().plusYears(2).toString());
        item.setMrp(new BigDecimal("120"));
        item.setQuantity(10);
        item.setFreeQuantity(1);
        item.setUnitPrice(new BigDecimal("90"));
        item.setDiscountPercent(new BigDecimal("5"));
        item.setGstPercentage(new BigDecimal("12"));

        PurchaseOrderRequest request = new PurchaseOrderRequest();
        request.setSupplierId("SUP-1");
        request.setSupplierInvoiceNumber("SUP-001");
        request.setDueDate(LocalDateTime.now().plusDays(7));
        request.setLrNumber("LR-001");
        request.setTransport("Test Transport");
        request.setPlaceOfSupply(supplyStateHint);
        request.setReverseCharge(false);
        request.setTermsAndConditions("Standard terms");
        request.setNotes("Test note");
        request.setItems(List.of(item));
        return request;
    }

    private Supplier activeSupplier(String id, String state, String stateCode) {
        return Supplier.builder()
                .id(id)
                .name("Supplier One")
                .status(SupplierStatus.ACTIVE)
                .deleted(false)
                .state(state)
                .stateCode(stateCode)
                .build();
    }

    private AppSettings appSettings(String companyState, String companyStateCode) {
        AppSettings settings = new AppSettings();
        AppSettings.Business business = new AppSettings.Business();
        business.setCompanyName("Test Pharma");
        business.setState(companyState);
        business.setStateCode(companyStateCode);
        business.setCompanyAddress("Addr");
        settings.setBusiness(business);
        return settings;
    }

    private Medicine medicine(String id) {
        return Medicine.builder()
                .id(id)
                .medicineName("Paracetamol")
                .stockQuantity(0)
                .build();
    }
}
