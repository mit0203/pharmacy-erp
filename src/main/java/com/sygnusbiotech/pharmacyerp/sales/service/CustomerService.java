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

        if (search != null && !search.trim().isEmpty()) {
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
        if (repository.existsByGstNumberAndDeletedFalse(request.getGstNumber())) {
            throw new BusinessException("Customer with this GST Number already exists", HttpStatus.CONFLICT);
        }

        if (repository.existsByPhoneAndDeletedFalse(request.getPhone())) {
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

        if (!existingGst.equals(newGst)
                && repository.existsByGstNumberAndDeletedFalse(newGst)) {
            throw new BusinessException("Another customer with this GST Number already exists", HttpStatus.CONFLICT);
        }

        String existingPhone = safe(existing.getPhone());
        String newPhone = safe(request.getPhone());

        if (!existingPhone.equals(newPhone)
                && repository.existsByPhoneAndDeletedFalse(newPhone)) {
            throw new BusinessException("Another customer with this phone number already exists", HttpStatus.CONFLICT);
        }

        String existingEmail = safe(existing.getEmail()).toLowerCase();
        String newEmail = safe(request.getEmail()).toLowerCase();

        if (!existingEmail.equals(newEmail)
                && hasText(newEmail)
                && repository.existsByEmailIgnoreCaseAndDeletedFalse(newEmail)) {
            throw new BusinessException("Another customer with this email already exists", HttpStatus.CONFLICT);
        }
    }

    private void normalizeRequest(CustomerRequest request) {
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

    private void normalizeCustomerEntity(Customer customer) {
        if (customer.getName() != null) {
            customer.setName(customer.getName().trim());
        }

        if (customer.getPhone() != null) {
            customer.setPhone(customer.getPhone().trim());
        }

        if (customer.getEmail() != null) {
            customer.setEmail(customer.getEmail().trim().toLowerCase());
        }

        if (customer.getAddress() != null) {
            customer.setAddress(customer.getAddress().trim());
        }

        if (customer.getGstNumber() != null) {
            customer.setGstNumber(customer.getGstNumber().trim().toUpperCase());
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}