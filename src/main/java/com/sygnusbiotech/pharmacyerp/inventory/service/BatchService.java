package com.sygnusbiotech.pharmacyerp.inventory.service;

import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import com.sygnusbiotech.pharmacyerp.inventory.dto.BatchRequest;
import com.sygnusbiotech.pharmacyerp.inventory.dto.BatchResponse;
import com.sygnusbiotech.pharmacyerp.inventory.mapper.BatchMapper;
import com.sygnusbiotech.pharmacyerp.inventory.model.Batch;
import com.sygnusbiotech.pharmacyerp.inventory.model.Medicine;
import com.sygnusbiotech.pharmacyerp.inventory.repository.BatchRepository;
import com.sygnusbiotech.pharmacyerp.inventory.repository.MedicineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BatchService {

    private final BatchRepository batchRepository;
    private final BatchMapper batchMapper;
    private final MedicineRepository medicineRepository;

    @Transactional
    public BatchResponse createBatch(BatchRequest request) {
        validateDates(request.getManufacturingDate(), request.getExpiryDate());

        Medicine medicine = medicineRepository.findByIdAndIsDeletedFalse(request.getMedicineId())
                .orElseThrow(() -> new BusinessException("Medicine not found", HttpStatus.NOT_FOUND));

        if (batchRepository.existsByBatchNumberAndMedicineIdAndIsDeletedFalse(request.getBatchNumber(), request.getMedicineId())) {
            throw new BusinessException("Batch number already exists for this medicine", HttpStatus.CONFLICT);
        }

        Batch batch = batchMapper.toEntity(request);
        batch = batchRepository.save(batch);

        updateMedicineStock(medicine, request.getQuantity());

        return batchMapper.toResponse(batch);
    }

    @Transactional
    public BatchResponse updateBatch(String id, BatchRequest request) {
        validateDates(request.getManufacturingDate(), request.getExpiryDate());

        Batch batch = batchRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Batch not found", HttpStatus.NOT_FOUND));

        if (!batch.getMedicineId().equals(request.getMedicineId())) {
            throw new BusinessException("Cannot change the medicine ID of an existing batch", HttpStatus.BAD_REQUEST);
        }
        
        if (!batch.getBatchNumber().equals(request.getBatchNumber()) && 
            batchRepository.existsByBatchNumberAndMedicineIdAndIsDeletedFalse(request.getBatchNumber(), request.getMedicineId())) {
            throw new BusinessException("Batch number already exists for this medicine", HttpStatus.CONFLICT);
        }

        int quantityDelta = request.getQuantity() - batch.getQuantity();

        batchMapper.updateEntityFromRequest(request, batch);
        batch = batchRepository.save(batch);

        if (quantityDelta != 0) {
            Medicine medicine = medicineRepository.findByIdAndIsDeletedFalse(batch.getMedicineId())
                    .orElseThrow(() -> new BusinessException("Medicine not found", HttpStatus.NOT_FOUND));
            updateMedicineStock(medicine, quantityDelta);
        }

        return batchMapper.toResponse(batch);
    }

    @Transactional
    public void deleteBatch(String id) {
        Batch batch = batchRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Batch not found", HttpStatus.NOT_FOUND));

        batch.setDeleted(true);
        batchRepository.save(batch);

        Medicine medicine = medicineRepository.findByIdAndIsDeletedFalse(batch.getMedicineId())
                .orElseThrow(() -> new BusinessException("Medicine not found", HttpStatus.NOT_FOUND));
        updateMedicineStock(medicine, -batch.getQuantity());
    }

    public Page<BatchResponse> getAllBatches(String search, Pageable pageable) {
        Page<Batch> batches;
        if (search != null && !search.trim().isEmpty()) {
            batches = batchRepository.searchActiveBatches(search, pageable);
        } else {
            batches = batchRepository.findByIsDeletedFalse(pageable);
        }
        return batches.map(batchMapper::toResponse);
    }

    public Page<BatchResponse> getBatchesByMedicine(String medicineId, Pageable pageable) {
        return batchRepository.findByMedicineIdAndIsDeletedFalse(medicineId, pageable)
                .map(batchMapper::toResponse);
    }

    public Page<BatchResponse> getNearExpiryBatches(LocalDate startDate, LocalDate endDate, Pageable pageable) {
        return batchRepository.findByExpiryDateBetweenAndIsDeletedFalse(startDate, endDate, pageable)
                .map(batchMapper::toResponse);
    }

    public Page<BatchResponse> getExpiredBatches(LocalDate date, Pageable pageable) {
        return batchRepository.findByExpiryDateBeforeAndIsDeletedFalse(date, pageable)
                .map(batchMapper::toResponse);
    }

    @Transactional
    public List<com.sygnusbiotech.pharmacyerp.inventory.dto.BatchAllocation> reduceStockUsingFEFO(String medicineId, int quantityToReduce) {
        if (quantityToReduce <= 0) {
            return new ArrayList<>();
        }

        // Get unexpired batches with quantity > 0 ordered by closest expiry
        List<Batch> availableBatches = batchRepository
                .findByMedicineIdAndExpiryDateAfterAndQuantityGreaterThanAndIsDeletedFalseOrderByExpiryDateAsc(
                        medicineId, LocalDate.now(), 0);

        int totalAvailable = availableBatches.stream().mapToInt(Batch::getQuantity).sum();
        if (totalAvailable < quantityToReduce) {
            throw new BusinessException("Insufficient unexpired stock available to reduce. Required: " + 
                    quantityToReduce + ", Available: " + totalAvailable, HttpStatus.BAD_REQUEST);
        }

        int remainingToReduce = quantityToReduce;
        List<Batch> updatedBatches = new ArrayList<>();
        List<com.sygnusbiotech.pharmacyerp.inventory.dto.BatchAllocation> allocations = new ArrayList<>();

        for (Batch batch : availableBatches) {
            if (remainingToReduce <= 0) {
                break;
            }

            int taken = Math.min(batch.getQuantity(), remainingToReduce);
            batch.setQuantity(batch.getQuantity() - taken);
            remainingToReduce -= taken;
            
            allocations.add(com.sygnusbiotech.pharmacyerp.inventory.dto.BatchAllocation.builder()
                    .batchId(batch.getId())
                    .batchNumber(batch.getBatchNumber())
                    .expiryDate(batch.getExpiryDate() != null ? batch.getExpiryDate().atStartOfDay() : null)
                    .allocatedQuantity(taken)
                    .build());
            updatedBatches.add(batch);
        }

        batchRepository.saveAll(updatedBatches);

        Medicine medicine = medicineRepository.findByIdAndIsDeletedFalse(medicineId)
                .orElseThrow(() -> new BusinessException("Medicine not found", HttpStatus.NOT_FOUND));
        updateMedicineStock(medicine, -quantityToReduce);
        
        return allocations;
    }
    
    public BatchResponse getBatchById(String id) {
        return batchMapper.toResponse(
                batchRepository.findByIdAndIsDeletedFalse(id)
                        .orElseThrow(() -> new BusinessException("Batch not found", HttpStatus.NOT_FOUND))
        );
    }

    private void updateMedicineStock(Medicine medicine, int delta) {
        medicine.setStockQuantity(medicine.getStockQuantity() + delta);
        if (medicine.getStockQuantity() < 0) {
            // Failsafe validation (in theory FEFO check handles it, but safety constraint)
            throw new BusinessException("Medicine stock cannot be negative", HttpStatus.BAD_REQUEST);
        }
        medicineRepository.save(medicine);
    }

    private void validateDates(LocalDate manufacturingDate, LocalDate expiryDate) {
        if (expiryDate.isBefore(manufacturingDate) || expiryDate.isEqual(manufacturingDate)) {
            throw new BusinessException("Expiry date must be strictly after manufacturing date", HttpStatus.BAD_REQUEST);
        }
    }
}
