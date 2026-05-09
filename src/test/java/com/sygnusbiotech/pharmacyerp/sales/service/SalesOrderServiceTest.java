package com.sygnusbiotech.pharmacyerp.sales.service;

import com.sygnusbiotech.pharmacyerp.accounting.service.LedgerEntryService;
import com.sygnusbiotech.pharmacyerp.inventory.dto.BatchAllocation;
import com.sygnusbiotech.pharmacyerp.inventory.model.Medicine;
import com.sygnusbiotech.pharmacyerp.inventory.repository.BatchRepository;
import com.sygnusbiotech.pharmacyerp.inventory.repository.MedicineRepository;
import com.sygnusbiotech.pharmacyerp.inventory.service.BatchService;
import com.sygnusbiotech.pharmacyerp.sales.dto.SalesOrderResponse;
import com.sygnusbiotech.pharmacyerp.sales.mapper.SalesOrderMapper;
import com.sygnusbiotech.pharmacyerp.sales.model.Customer;
import com.sygnusbiotech.pharmacyerp.sales.model.CustomerStatus;
import com.sygnusbiotech.pharmacyerp.sales.model.PaymentStatus;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesItem;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesOrder;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesOrderStatus;
import com.sygnusbiotech.pharmacyerp.sales.repository.CustomerRepository;
import com.sygnusbiotech.pharmacyerp.sales.repository.SalesOrderRepository;
import com.sygnusbiotech.pharmacyerp.settings.repository.AppSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SalesOrderServiceTest {

    @Mock
    private SalesOrderRepository salesOrderRepository;
    @Mock
    private SalesOrderMapper salesOrderMapper;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private MedicineRepository medicineRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private BatchService batchService;
    @Mock
    private LedgerEntryService ledgerEntryService;
    @Mock
    private AppSettingsRepository appSettingsRepository;

    private SalesOrderService service;

    @BeforeEach
    void setUp() {
        service = new SalesOrderService(
                salesOrderRepository,
                salesOrderMapper,
                customerRepository,
                medicineRepository,
                batchRepository,
                batchService,
                ledgerEntryService,
                appSettingsRepository
        );

        when(salesOrderRepository.save(any(SalesOrder.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(salesOrderMapper.toResponse(any(SalesOrder.class)))
                .thenAnswer(invocation -> {
                    SalesOrder order = invocation.getArgument(0);
                    SalesOrderResponse response = new SalesOrderResponse();
                    response.setOrderNumber(order.getOrderNumber());
                    response.setAmountDue(order.getAmountDue());
                    response.setGrandTotal(order.getGrandTotal());
                    return response;
                });
    }

    @Test
    void confirmSalesOrder_fefoAllocationPreservesInvoiceFields() {
        SalesItem draftItem = SalesItem.builder()
                .medicineId("MED-1")
                .quantity(10)
                .freeQuantity(2)
                .unitPrice(new BigDecimal("90"))
                .mrp(new BigDecimal("120"))
                .pack("10x10")
                .hsn("3004")
                .discountPercent(new BigDecimal("5"))
                .gstPercentage(new BigDecimal("12"))
                .build();

        SalesOrder draftOrder = SalesOrder.builder()
                .id("SO-1")
                .orderNumber("SO-1001")
                .customerId("CUST-1")
                .status(SalesOrderStatus.DRAFT)
                .placeOfSupply("Maharashtra")
                .items(List.of(draftItem))
                .build();

        when(salesOrderRepository.findByIdAndIsDeletedFalse("SO-1")).thenReturn(Optional.of(draftOrder));
        when(customerRepository.findById("CUST-1")).thenReturn(Optional.of(activeCustomer("CUST-1", "Maharashtra")));
        when(medicineRepository.findByIdAndIsDeletedFalse("MED-1")).thenReturn(Optional.of(medicine("MED-1", 100)));
        when(batchService.reduceStockUsingFEFO("MED-1", 10))
                .thenReturn(List.of(
                        BatchAllocation.builder().batchId("B1").allocatedQuantity(6).build(),
                        BatchAllocation.builder().batchId("B2").allocatedQuantity(4).build()
                ));

        service.confirmSalesOrder("SO-1");

        ArgumentCaptor<SalesOrder> captor = ArgumentCaptor.forClass(SalesOrder.class);
        verify(salesOrderRepository).save(captor.capture());
        SalesOrder saved = captor.getValue();

        assertEquals(SalesOrderStatus.CONFIRMED, saved.getStatus());
        assertEquals(2, saved.getItems().size());

        SalesItem first = saved.getItems().get(0);
        SalesItem second = saved.getItems().get(1);

        assertEquals("10x10", first.getPack());
        assertEquals("3004", first.getHsn());
        assertEquals(0, new BigDecimal("120").compareTo(first.getMrp()));
        assertEquals(2, first.getFreeQuantity());
        assertEquals(0, new BigDecimal("5.00").compareTo(first.getDiscountPercent()));
        assertEquals(0, new BigDecimal("12.00").compareTo(first.getGstPercentage()));
        assertEquals(0, new BigDecimal("6.00").compareTo(first.getCgstPercent()));
        assertEquals(0, new BigDecimal("0.00").compareTo(first.getIgstPercent()));
        assertEquals(0, second.getFreeQuantity());

        assertEquals(0, new BigDecimal("513.00").compareTo(first.getTaxableValue()));
        assertEquals(0, new BigDecimal("61.56").compareTo(first.getGstAmount()));
        assertEquals(0, new BigDecimal("574.56").compareTo(first.getLineTotal()));
        assertEquals(0, new BigDecimal("342.00").compareTo(second.getTaxableValue()));
        assertEquals(0, new BigDecimal("41.04").compareTo(second.getGstAmount()));
        assertEquals(0, new BigDecimal("383.04").compareTo(second.getLineTotal()));
        assertEquals(0, new BigDecimal("958.00").compareTo(saved.getGrandTotal()));
    }

    @Test
    void updatePaymentStatus_usesGrandTotalAsPayableTotal() {
        SalesOrder order = SalesOrder.builder()
                .id("SO-2")
                .orderNumber("SO-1002")
                .status(SalesOrderStatus.COMPLETED)
                .invoiceNumber("SINV-1")
                .totalAmount(new BigDecimal("957.60"))
                .grandTotal(new BigDecimal("958"))
                .amountPaid(BigDecimal.ZERO)
                .paymentStatus(PaymentStatus.UNPAID)
                .build();

        when(salesOrderRepository.findByIdAndIsDeletedFalse("SO-2")).thenReturn(Optional.of(order));

        service.updatePaymentStatus("SO-2", PaymentStatus.PARTIALLY_PAID, new BigDecimal("957.90"));

        ArgumentCaptor<SalesOrder> captor = ArgumentCaptor.forClass(SalesOrder.class);
        verify(salesOrderRepository).save(captor.capture());
        SalesOrder saved = captor.getValue();

        assertEquals(new BigDecimal("957.90"), saved.getAmountPaid());
        assertEquals(new BigDecimal("0.10"), saved.getAmountDue());
        assertEquals(PaymentStatus.PARTIALLY_PAID, saved.getPaymentStatus());
    }

    private Customer activeCustomer(String id, String state) {
        return Customer.builder()
                .id(id)
                .name("Customer One")
                .state(state)
                .status(CustomerStatus.ACTIVE)
                .deleted(false)
                .build();
    }

    private Medicine medicine(String id, int stockQty) {
        return Medicine.builder()
                .id(id)
                .medicineName("Paracetamol")
                .stockQuantity(stockQty)
                .build();
    }
}
