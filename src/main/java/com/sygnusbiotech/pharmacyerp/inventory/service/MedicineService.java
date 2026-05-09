package com.sygnusbiotech.pharmacyerp.inventory.service;

import org.springframework.context.ApplicationEventPublisher;
import com.sygnusbiotech.pharmacyerp.inventory.event.InventoryAlertEvent;

import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import com.sygnusbiotech.pharmacyerp.inventory.dto.MedicineRequest;
import com.sygnusbiotech.pharmacyerp.inventory.dto.MedicineResponse;
import com.sygnusbiotech.pharmacyerp.inventory.mapper.MedicineMapper;
import com.sygnusbiotech.pharmacyerp.inventory.model.Medicine;
import com.sygnusbiotech.pharmacyerp.inventory.repository.MedicineRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MedicineService {

    private static final Logger log = LoggerFactory.getLogger(MedicineService.class);
    private final MedicineRepository repository;
    private final MedicineMapper mapper;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public MedicineResponse createMedicine(MedicineRequest request) {
        if (repository.existsBySkuAndIsDeletedFalse(request.getSku())) {
            throw new BusinessException("Medicine with SKU already exists!", HttpStatus.CONFLICT);
        }

        Medicine medicine = mapper.toEntity(request);
        medicine = repository.save(medicine);
        
        checkStockThresholds(medicine); // Hook for future alerts

        return mapper.toResponse(medicine);
    }

    public Page<MedicineResponse> getAllMedicines(String keyword, Pageable pageable) {
        Page<Medicine> medicines;
        if (keyword != null && !keyword.trim().isEmpty()) {
            medicines = repository.searchActiveMedicines(keyword, pageable);
        } else {
            medicines = repository.findByIsDeletedFalse(pageable);
        }
        return medicines.map(mapper::toResponse);
    }

    public MedicineResponse getMedicineById(String id) {
        Medicine medicine = repository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Medicine not found", HttpStatus.NOT_FOUND));
        return mapper.toResponse(medicine);
    }

    @Transactional
    public MedicineResponse updateMedicine(String id, MedicineRequest request) {
        Medicine medicine = repository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Medicine not found", HttpStatus.NOT_FOUND));

        if (!medicine.getSku().equals(request.getSku()) && repository.existsBySkuAndIsDeletedFalse(request.getSku())) {
            throw new BusinessException("Another medicine with this SKU already exists!", HttpStatus.CONFLICT);
        }

        mapper.updateEntityFromRequest(request, medicine);
        medicine = repository.save(medicine);

        checkStockThresholds(medicine); // Hook for future alerts
        
        return mapper.toResponse(medicine);
    }

    @Transactional
    public void deleteMedicine(String id) {
        Medicine medicine = repository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Medicine not found", HttpStatus.NOT_FOUND));

        medicine.setDeleted(true); // Soft delete
        repository.save(medicine);
    }

    /**
     * Extensible Stock check. Configured to act as a trigger hook.
     * Future Feature: Can be hooked into Spring ApplicationEvents or Kafka.
     */
    private void checkStockThresholds(Medicine medicine) {
        if (medicine.getStockQuantity() <= medicine.getMinimumStockLevel()) {
            log.warn("LOW STOCK ALERT TRIGGERED: Medicine '{}' (SKU: {}) is at {} units.", 
                    medicine.getMedicineName(), medicine.getSku(), medicine.getStockQuantity());
            eventPublisher.publishEvent(new InventoryAlertEvent(this, medicine.getId()));
        }
    }
}
