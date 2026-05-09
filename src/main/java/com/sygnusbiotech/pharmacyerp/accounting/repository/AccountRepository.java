package com.sygnusbiotech.pharmacyerp.accounting.repository;

import com.sygnusbiotech.pharmacyerp.accounting.model.Account;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepository extends MongoRepository<Account, String> {

    Optional<Account> findByIdAndIsDeletedFalse(String id);

    Page<Account> findByIsDeletedFalse(Pageable pageable);

    @Query("{ 'isDeleted' : false, '$or' : [ " +
           "{ 'accountCode' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'accountName' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'accountType' : { $regex: ?0, $options: 'i' } } " +
           "] }")
    Page<Account> searchActiveAccounts(String keyword, Pageable pageable);

    boolean existsByAccountCodeAndIsDeletedFalse(String accountCode);

    Optional<Account> findByAccountCodeAndIsDeletedFalse(String accountCode);
}
