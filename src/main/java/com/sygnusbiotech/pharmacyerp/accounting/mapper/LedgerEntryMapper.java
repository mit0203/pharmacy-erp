package com.sygnusbiotech.pharmacyerp.accounting.mapper;

import com.sygnusbiotech.pharmacyerp.accounting.dto.LedgerEntryRequest;
import com.sygnusbiotech.pharmacyerp.accounting.dto.LedgerEntryResponse;
import com.sygnusbiotech.pharmacyerp.accounting.model.LedgerEntry;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface LedgerEntryMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "isDeleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    LedgerEntry toEntity(LedgerEntryRequest request);

    @Mapping(target = "debitAccountName", ignore = true)
    @Mapping(target = "creditAccountName", ignore = true)
    LedgerEntryResponse toResponse(LedgerEntry entity);
}
