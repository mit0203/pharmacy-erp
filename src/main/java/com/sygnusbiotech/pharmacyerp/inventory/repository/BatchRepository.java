package com.sygnusbiotech.pharmacyerp.inventory.repository;

import com.sygnusbiotech.pharmacyerp.inventory.model.Batch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BatchRepository extends MongoRepository<Batch, String> {
    
    Page<Batch> findByMedicineIdAndIsDeletedFalse(String medicineId, Pageable pageable);
    
    List<Batch> findByMedicineIdAndIsDeletedFalse(String medicineId);

    Page<Batch> findByExpiryDateBeforeAndIsDeletedFalse(LocalDate date, Pageable pageable);

    Page<Batch> findByExpiryDateBetweenAndIsDeletedFalse(LocalDate startDate, LocalDate endDate, Pageable pageable);

    List<Batch> findByMedicineIdAndExpiryDateAfterAndQuantityGreaterThanAndIsDeletedFalseOrderByExpiryDateAsc(
            String medicineId, LocalDate date, Integer quantity);

    Optional<Batch> findByIdAndIsDeletedFalse(String id);
    
    boolean existsByBatchNumberAndMedicineIdAndIsDeletedFalse(String batchNumber, String medicineId);
    
    Optional<Batch> findByBatchNumberAndMedicineIdAndIsDeletedFalse(String batchNumber, String medicineId);

    Page<Batch> findByIsDeletedFalse(Pageable pageable);

    @Query("{ 'isDeleted' : false, '$or' : [ { 'batchNumber' : { $regex: ?0, $options: 'i' } } ] }")
    Page<Batch> searchActiveBatches(String keyword, Pageable pageable);

    // --- Reports queries ---

    List<Batch> findByExpiryDateBeforeAndIsDeletedFalse(LocalDate date);

    List<Batch> findByExpiryDateBetweenAndIsDeletedFalse(LocalDate startDate, LocalDate endDate);

    // --- Dashboard queries ---

    long countByExpiryDateBeforeAndIsDeletedFalse(LocalDate date);

    long countByExpiryDateBetweenAndIsDeletedFalse(LocalDate startDate, LocalDate endDate);
}
