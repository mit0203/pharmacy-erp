package com.sygnusbiotech.pharmacyerp.inventory.mapper;

import com.sygnusbiotech.pharmacyerp.inventory.dto.BatchRequest;
import com.sygnusbiotech.pharmacyerp.inventory.dto.BatchResponse;
import com.sygnusbiotech.pharmacyerp.inventory.model.Batch;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface BatchMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "isDeleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Batch toEntity(BatchRequest request);

    @Mapping(source = "deleted", target = "softDeletedAlert")
    BatchResponse toResponse(Batch entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "medicineId", ignore = true) // Disallow moving a batch to another medicine after creation
    void updateEntityFromRequest(BatchRequest request, @MappingTarget Batch entity);
}
