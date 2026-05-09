package com.sygnusbiotech.pharmacyerp.accounting.repository;

import com.sygnusbiotech.pharmacyerp.accounting.model.LedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface LedgerEntryRepository extends MongoRepository<LedgerEntry, String> {

    Page<LedgerEntry> findByIsDeletedFalse(Pageable pageable);

    @Query("{ 'isDeleted' : false, '$or' : [ " +
           "{ 'referenceType' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'referenceId' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'description' : { $regex: ?0, $options: 'i' } }, " +
           "{ 'entryType' : { $regex: ?0, $options: 'i' } } " +
           "] }")
    Page<LedgerEntry> searchActiveLedgerEntries(String keyword, Pageable pageable);

    @Query("{ 'isDeleted' : false, '$or' : [ " +
           "{ 'debitAccountId' : ?0 }, " +
           "{ 'creditAccountId' : ?0 } " +
           "] }")
    Page<LedgerEntry> findByAccountId(String accountId, Pageable pageable);

    @Query(value = "{ 'isDeleted' : false, '$or' : [ " +
           "{ 'debitAccountId' : ?0 }, " +
           "{ 'creditAccountId' : ?0 } " +
           "] }", exists = true)
    boolean existsByAccountId(String accountId);

    boolean existsByReferenceTypeAndReferenceIdAndEntryTypeAndIsDeletedFalse(
            String referenceType, String referenceId, com.sygnusbiotech.pharmacyerp.accounting.model.EntryType entryType);
}
