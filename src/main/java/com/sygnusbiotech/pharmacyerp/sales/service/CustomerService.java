package com.sygnusbiotech.pharmacyerp.sales.service;

import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import com.sygnusbiotech.pharmacyerp.sales.dto.CustomerRequest;
import com.sygnusbiotech.pharmacyerp.sales.dto.CustomerResponse;
import com.sygnusbiotech.pharmacyerp.sales.mapper.CustomerMapper;
import com.sygnusbiotech.pharmacyerp.sales.model.Customer;
import com.sygnusbiotech.pharmacyerp.sales.repository.CustomerRepository;
import com.sygnusbiotech.pharmacyerp.sales.repository.SalesOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository repository;
    private final CustomerMapper mapper;
    private final SalesOrderRepository salesOrderRepository;

    @Transactional
    public CustomerResponse createCustomer(CustomerRequest request) {
        normalizeRequest(request);
        validateUniqueFieldsForCreate(request);

        Customer customer = mapper.toEntity(request);
        normalizeCustomerEntity(customer);
        customer = repository.save(customer);

        return mapper.toResponse(customer);
    }

    public Page<CustomerResponse> getAllCustomers(String search, Pageable pageable) {
        Page<Customer> customers;

        if (hasText(search)) {
            customers = repository.searchActiveCustomers(search.trim(), pageable);
        } else {
            customers = repository.findByDeletedFalse(pageable);
        }

        return customers.map(mapper::toResponse);
    }

    public CustomerResponse getCustomerById(String id) {
        Customer customer = repository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Customer not found", HttpStatus.NOT_FOUND));

        return mapper.toResponse(customer);
    }

    @Transactional
    public CustomerResponse updateCustomer(String id, CustomerRequest request) {
        Customer customer = repository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Customer not found", HttpStatus.NOT_FOUND));

        normalizeRequest(request);
        validateUniqueFieldsForUpdate(customer, request);

        mapper.updateEntityFromRequest(request, customer);
        normalizeCustomerEntity(customer);
        customer = repository.save(customer);

        return mapper.toResponse(customer);
    }

    @Transactional
    public void deleteCustomer(String id) {
        Customer customer = repository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Customer not found", HttpStatus.NOT_FOUND));

        if (salesOrderRepository.existsByCustomerIdAndIsDeletedFalse(id)) {
            throw new BusinessException(
                    "Cannot delete customer because sales orders exist for this customer",
                    HttpStatus.BAD_REQUEST
            );
        }

        customer.setDeleted(true);
        repository.save(customer);
    }

    private void validateUniqueFieldsForCreate(CustomerRequest request) {
        if (hasText(request.getGstNumber())
                && repository.existsByGstNumberAndDeletedFalse(request.getGstNumber())) {
            throw new BusinessException("Customer with this GST Number already exists", HttpStatus.CONFLICT);
        }

        if (hasText(request.getPhone())
                && repository.existsByPhoneAndDeletedFalse(request.getPhone())) {
            throw new BusinessException("Customer with this phone number already exists", HttpStatus.CONFLICT);
        }

        if (hasText(request.getEmail())
                && repository.existsByEmailIgnoreCaseAndDeletedFalse(request.getEmail())) {
            throw new BusinessException("Customer with this email already exists", HttpStatus.CONFLICT);
        }
    }

    private void validateUniqueFieldsForUpdate(Customer existing, CustomerRequest request) {
        String existingGst = safe(existing.getGstNumber());
        String newGst = safe(request.getGstNumber());

        if (hasText(newGst)
                && !existingGst.equals(newGst)
                && repository.existsByGstNumberAndDeletedFalse(newGst)) {
            throw new BusinessException("Another customer with this GST Number already exists", HttpStatus.CONFLICT);
        }

        String existingPhone = safe(existing.getPhone());
        String newPhone = safe(request.getPhone());

        if (hasText(newPhone)
                && !existingPhone.equals(newPhone)
                && repository.existsByPhoneAndDeletedFalse(newPhone)) {
            throw new BusinessException("Another customer with this phone number already exists", HttpStatus.CONFLICT);
        }

        String existingEmail = safe(existing.getEmail()).toLowerCase();
        String newEmail = safe(request.getEmail()).toLowerCase();

        if (hasText(newEmail)
                && !existingEmail.equals(newEmail)
                && repository.existsByEmailIgnoreCaseAndDeletedFalse(newEmail)) {
            throw new BusinessException("Another customer with this email already exists", HttpStatus.CONFLICT);
        }
    }

    private void normalizeRequest(CustomerRequest request) {
        request.setName(clean(request.getName()));
        request.setPhone(clean(request.getPhone()));
        request.setEmail(cleanLower(request.getEmail()));
        request.setAddress(clean(request.getAddress()));
        request.setGstNumber(cleanUpper(request.getGstNumber()));
        request.setDlNumber(cleanUpper(request.getDlNumber()));
        request.setState(clean(request.getState()));
        request.setStateCode(clean(request.getStateCode()));
    }

    private void normalizeCustomerEntity(Customer customer) {
        customer.setName(clean(customer.getName()));
        customer.setPhone(clean(customer.getPhone()));
        customer.setEmail(cleanLower(customer.getEmail()));
        customer.setAddress(clean(customer.getAddress()));
        customer.setGstNumber(cleanUpper(customer.getGstNumber()));
        customer.setDlNumber(cleanUpper(customer.getDlNumber()));
        customer.setState(clean(customer.getState()));
        customer.setStateCode(clean(customer.getStateCode()));
    }

    private String clean(String value) {
        if (!hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String cleanLower(String value) {
        String cleaned = clean(value);
        return cleaned == null ? null : cleaned.toLowerCase();
    }

    private String cleanUpper(String value) {
        String cleaned = clean(value);
        return cleaned == null ? null : cleaned.toUpperCase();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
