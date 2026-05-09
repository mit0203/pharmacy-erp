package com.sygnusbiotech.pharmacyerp.sales.mapper;

import com.sygnusbiotech.pharmacyerp.sales.dto.CustomerRequest;
import com.sygnusbiotech.pharmacyerp.sales.dto.CustomerResponse;
import com.sygnusbiotech.pharmacyerp.sales.model.Customer;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CustomerMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Customer toEntity(CustomerRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromRequest(CustomerRequest request, @MappingTarget Customer entity);

    CustomerResponse toResponse(Customer entity);
}