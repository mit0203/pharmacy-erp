package com.sygnusbiotech.pharmacyerp.accounting.mapper;

import com.sygnusbiotech.pharmacyerp.accounting.dto.AccountRequest;
import com.sygnusbiotech.pharmacyerp.accounting.dto.AccountResponse;
import com.sygnusbiotech.pharmacyerp.accounting.model.Account;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface AccountMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "currentBalance", ignore = true)
    @Mapping(target = "isDeleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Account toEntity(AccountRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "currentBalance", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromRequest(AccountRequest request, @MappingTarget Account entity);

    AccountResponse toResponse(Account entity);
}
