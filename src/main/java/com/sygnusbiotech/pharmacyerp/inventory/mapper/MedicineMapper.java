package com.sygnusbiotech.pharmacyerp.inventory.mapper;

import com.sygnusbiotech.pharmacyerp.inventory.dto.MedicineRequest;
import com.sygnusbiotech.pharmacyerp.inventory.dto.MedicineResponse;
import com.sygnusbiotech.pharmacyerp.inventory.model.Medicine;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface MedicineMapper {

@Mapping(target = "id", ignore = true)
@Mapping(target = "stockQuantity", ignore = true)
@Mapping(target = "isDeleted", ignore = true)
@Mapping(target = "createdAt", ignore = true)
@Mapping(target = "updatedAt", ignore = true)
Medicine toEntity(MedicineRequest request);

@Mapping(source = "deleted", target = "softDeletedAlert")
MedicineResponse toResponse(Medicine entity);

@Mapping(target = "id", ignore = true)
@Mapping(target = "stockQuantity", ignore = true)
@Mapping(target = "deleted", ignore = true)
@Mapping(target = "createdAt", ignore = true)
@Mapping(target = "updatedAt", ignore = true)
void updateEntityFromRequest(MedicineRequest request, @MappingTarget Medicine entity);

}

