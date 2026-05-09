package com.sygnusbiotech.pharmacyerp.sales.repository;

import com.sygnusbiotech.pharmacyerp.sales.model.SalesOrder;
import com.sygnusbiotech.pharmacyerp.sales.model.SalesOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SalesOrderRepository extends MongoRepository<SalesOrder, String> {

    @Query("{ 'isDeleted' : false, '$or' : [ " +
           "{ 'orderNumber' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'customerId' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'status' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'invoiceNumber' : { $regex: ?0, $options: 'i' } } ] }")
    Page<SalesOrder> searchActiveOrders(String keyword, Pageable pageable);

    Page<SalesOrder> findByIsDeletedFalse(Pageable pageable);

    Optional<SalesOrder> findByIdAndIsDeletedFalse(String id);

    boolean existsByInvoiceNumberAndIsDeletedFalse(String invoiceNumber);

    boolean existsByCustomerIdAndIsDeletedFalse(String customerId);

    List<SalesOrder> findByStatusAndIsDeletedFalse(SalesOrderStatus status);

    List<SalesOrder> findByStatusAndIsDeletedFalseAndOrderDateBetween(
            SalesOrderStatus status, LocalDateTime startDate, LocalDateTime endDate);
}