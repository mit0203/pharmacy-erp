package com.sygnusbiotech.pharmacyerp.supplier.service;

import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import com.sygnusbiotech.pharmacyerp.purchase.repository.PurchaseOrderRepository;
import com.sygnusbiotech.pharmacyerp.supplier.dto.SupplierRequest;
import com.sygnusbiotech.pharmacyerp.supplier.dto.SupplierResponse;
import com.sygnusbiotech.pharmacyerp.supplier.mapper.SupplierMapper;
import com.sygnusbiotech.pharmacyerp.supplier.model.Supplier;
import com.sygnusbiotech.pharmacyerp.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository repository;
    private final SupplierMapper mapper;
    private final PurchaseOrderRepository purchaseOrderRepository;

    @Transactional
    public SupplierResponse createSupplier(SupplierRequest request) {
        normalizeRequest(request);
        validateUniqueFieldsForCreate(request);

        Supplier supplier = mapper.toEntity(request);
        normalizeSupplierEntity(supplier);
        supplier = repository.save(supplier);

        return mapper.toResponse(supplier);
    }

    public Page<SupplierResponse> getAllSuppliers(String keyword, Pageable pageable) {
        Page<Supplier> suppliers;

        if (keyword != null && !keyword.trim().isEmpty()) {
            suppliers = repository.searchActiveSuppliers(keyword.trim(), pageable);
        } else {
            suppliers = repository.findByDeletedFalse(pageable);
        }

        return suppliers.map(mapper::toResponse);
    }

    public SupplierResponse getSupplierById(String id) {
        Supplier supplier = repository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Supplier not found", HttpStatus.NOT_FOUND));

        return mapper.toResponse(supplier);
    }

    @Transactional
    public SupplierResponse updateSupplier(String id, SupplierRequest request) {
        Supplier supplier = repository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Supplier not found", HttpStatus.NOT_FOUND));

        normalizeRequest(request);
        validateUniqueFieldsForUpdate(supplier, request);

        mapper.updateEntityFromRequest(request, supplier);
        normalizeSupplierEntity(supplier);
        supplier = repository.save(supplier);

        return mapper.toResponse(supplier);
    }

    @Transactional
    public void deleteSupplier(String id) {
        Supplier supplier = repository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Supplier not found", HttpStatus.NOT_FOUND));

        if (purchaseOrderRepository.existsBySupplierIdAndIsDeletedFalse(id)) {
            throw new BusinessException(
                    "Cannot delete supplier because purchase orders exist for this supplier",
                    HttpStatus.BAD_REQUEST
            );
        }

        supplier.setDeleted(true);
        repository.save(supplier);
    }

    private void validateUniqueFieldsForCreate(SupplierRequest request) {
        if (repository.existsByGstNumberAndDeletedFalse(request.getGstNumber())) {
            throw new BusinessException("Supplier with this GST Number already exists", HttpStatus.CONFLICT);
        }

        if (repository.existsByPhoneAndDeletedFalse(request.getPhone())) {
            throw new BusinessException("Supplier with this phone number already exists", HttpStatus.CONFLICT);
        }

        if (hasText(request.getEmail())
                && repository.existsByEmailIgnoreCaseAndDeletedFalse(request.getEmail())) {
            throw new BusinessException("Supplier with this email already exists", HttpStatus.CONFLICT);
        }
    }

    private void validateUniqueFieldsForUpdate(Supplier existing, SupplierRequest request) {
        String existingGst = safe(existing.getGstNumber());
        String newGst = safe(request.getGstNumber());

        if (!existingGst.equals(newGst)
                && repository.existsByGstNumberAndDeletedFalse(newGst)) {
            throw new BusinessException("Another supplier with this GST Number already exists", HttpStatus.CONFLICT);
        }

        String existingPhone = safe(existing.getPhone());
        String newPhone = safe(request.getPhone());

        if (!existingPhone.equals(newPhone)
                && repository.existsByPhoneAndDeletedFalse(newPhone)) {
            throw new BusinessException("Another supplier with this phone number already exists", HttpStatus.CONFLICT);
        }

        String existingEmail = safe(existing.getEmail()).toLowerCase();
        String newEmail = safe(request.getEmail()).toLowerCase();

        if (!existingEmail.equals(newEmail)
                && hasText(newEmail)
                && repository.existsByEmailIgnoreCaseAndDeletedFalse(newEmail)) {
            throw new BusinessException("Another supplier with this email already exists", HttpStatus.CONFLICT);
        }
    }

    private void normalizeRequest(SupplierRequest request) {
        if (request.getName() != null) {
            request.setName(request.getName().trim());
        }

        if (request.getPhone() != null) {
            request.setPhone(request.getPhone().trim());
        }

        if (request.getEmail() != null) {
            request.setEmail(request.getEmail().trim().toLowerCase());
        }

        if (request.getAddress() != null) {
            request.setAddress(request.getAddress().trim());
        }

        if (request.getGstNumber() != null) {
            request.setGstNumber(request.getGstNumber().trim().toUpperCase());
        }
    }

    private void normalizeSupplierEntity(Supplier supplier) {
        if (supplier.getName() != null) {
            supplier.setName(supplier.getName().trim());
        }

        if (supplier.getPhone() != null) {
            supplier.setPhone(supplier.getPhone().trim());
        }

        if (supplier.getEmail() != null) {
            supplier.setEmail(supplier.getEmail().trim().toLowerCase());
        }

        if (supplier.getAddress() != null) {
            supplier.setAddress(supplier.getAddress().trim());
        }

        if (supplier.getGstNumber() != null) {
            supplier.setGstNumber(supplier.getGstNumber().trim().toUpperCase());
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}