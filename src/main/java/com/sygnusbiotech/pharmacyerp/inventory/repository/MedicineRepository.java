package com.sygnusbiotech.pharmacyerp.inventory.repository;

import com.sygnusbiotech.pharmacyerp.inventory.model.Medicine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineRepository extends MongoRepository<Medicine, String> {
    
    Page<Medicine> findByIsDeletedFalse(Pageable pageable);
    
    // Allows searching by Name/SKU ignoring case, excluding logically deleted entries
    @Query("{ 'isDeleted' : false, '$or' : [ { 'medicineName' : { $regex: ?0, $options: 'i' } }, { 'sku' : { $regex: ?0, $options: 'i' } } ] }")
    Page<Medicine> searchActiveMedicines(String keyword, Pageable pageable);
    
    Optional<Medicine> findByIdAndIsDeletedFalse(String id);
    
    boolean existsBySkuAndIsDeletedFalse(String sku);

    // --- Reports queries ---

    List<Medicine> findAllByIsDeletedFalse();

    // --- Dashboard queries ---

    long countByIsDeletedFalse();

    @Query(value = "{ 'isDeleted': false, '$expr': { '$lte': ['$stockQuantity', '$minimumStockLevel'] } }", count = true)
    long countLowStockMedicines();

    @Query(value = "{ 'isDeleted': false, 'stockQuantity': 0 }", count = true)
    long countOutOfStockMedicines();
}
