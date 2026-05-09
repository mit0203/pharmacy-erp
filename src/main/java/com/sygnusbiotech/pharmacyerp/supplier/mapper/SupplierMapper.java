package com.sygnusbiotech.pharmacyerp.supplier.mapper;

import com.sygnusbiotech.pharmacyerp.supplier.dto.SupplierRequest;
import com.sygnusbiotech.pharmacyerp.supplier.dto.SupplierResponse;
import com.sygnusbiotech.pharmacyerp.supplier.model.Supplier;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SupplierMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Supplier toEntity(SupplierRequest request);

    @Mapping(source = "deleted", target = "softDeletedAlert")
    SupplierResponse toResponse(Supplier entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromRequest(SupplierRequest request, @MappingTarget Supplier entity);
}
