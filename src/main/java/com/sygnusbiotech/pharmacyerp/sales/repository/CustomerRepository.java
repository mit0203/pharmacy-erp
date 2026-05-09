package com.sygnusbiotech.pharmacyerp.sales.repository;

import com.sygnusbiotech.pharmacyerp.sales.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends MongoRepository<Customer, String> {

    Page<Customer> findByDeletedFalse(Pageable pageable);

    @Query("{ 'deleted' : false, '$or' : [ " +
           "{ 'name' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'gstNumber' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'phone' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'email' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'address' : { $regex: ?0, $options: 'i' } } " +
           "] }")
    Page<Customer> searchActiveCustomers(String keyword, Pageable pageable);

    Optional<Customer> findByIdAndDeletedFalse(String id);

    boolean existsByGstNumberAndDeletedFalse(String gstNumber);

    boolean existsByPhoneAndDeletedFalse(String phone);

    boolean existsByEmailIgnoreCaseAndDeletedFalse(String email);
}