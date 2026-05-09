package com.sygnusbiotech.pharmacyerp.purchase.repository;

import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrder;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends MongoRepository<PurchaseOrder, String> {

    @Query("{ 'isDeleted' : false, '$or' : [ " +
           "{ 'orderNumber' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'supplierId' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'status' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'invoiceNumber' : { $regex: ?0, $options: 'i' } } " +
           "] }")
    Page<PurchaseOrder> searchActiveOrders(String keyword, Pageable pageable);

    Page<PurchaseOrder> findByIsDeletedFalse(Pageable pageable);

    Optional<PurchaseOrder> findByIdAndIsDeletedFalse(String id);

    boolean existsByInvoiceNumberAndIsDeletedFalse(String invoiceNumber);

    boolean existsBySupplierIdAndIsDeletedFalse(String supplierId);

    // --- Reports queries ---

    List<PurchaseOrder> findByStatusAndIsDeletedFalse(PurchaseOrderStatus status);

    List<PurchaseOrder> findByStatusAndIsDeletedFalseAndOrderDateBetween(
            PurchaseOrderStatus status, LocalDateTime startDate, LocalDateTime endDate);
}