package com.sygnusbiotech.pharmacyerp.supplier.repository;

import com.sygnusbiotech.pharmacyerp.supplier.model.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SupplierRepository extends MongoRepository<Supplier, String> {

    // Get all active suppliers (not deleted)
    Page<Supplier> findByDeletedFalse(Pageable pageable);

    // Search suppliers (name, GST, phone, email, address)
    @Query("{ 'deleted': false, '$or': [ " +
            "{ 'name': { $regex: ?0, $options: 'i' } }, " +
            "{ 'gstNumber': { $regex: ?0, $options: 'i' } }, " +
            "{ 'phone': { $regex: ?0, $options: 'i' } }, " +
            "{ 'email': { $regex: ?0, $options: 'i' } }, " +
            "{ 'address': { $regex: ?0, $options: 'i' } } " +
            "] }")
    Page<Supplier> searchActiveSuppliers(String keyword, Pageable pageable);

    // Get single supplier
    Optional<Supplier> findByIdAndDeletedFalse(String id);

    // Duplicate checks
    boolean existsByGstNumberAndDeletedFalse(String gstNumber);

    boolean existsByPhoneAndDeletedFalse(String phone);

    boolean existsByEmailIgnoreCaseAndDeletedFalse(String email);
}