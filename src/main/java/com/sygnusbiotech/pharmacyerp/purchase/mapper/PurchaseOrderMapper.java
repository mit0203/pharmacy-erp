package com.sygnusbiotech.pharmacyerp.purchase.mapper;

import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseItemRequest;
import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseItemResponse;
import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseOrderRequest;
import com.sygnusbiotech.pharmacyerp.purchase.dto.PurchaseOrderResponse;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseItem;
import com.sygnusbiotech.pharmacyerp.purchase.model.PurchaseOrder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface PurchaseOrderMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "orderNumber", ignore = true)
    @Mapping(target = "orderDate", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "paymentStatus", ignore = true)
    @Mapping(target = "invoiceNumber", ignore = true)
    @Mapping(target = "invoiceDate", ignore = true)
    @Mapping(target = "totalAmount", ignore = true)
    @Mapping(target = "totalGstAmount", ignore = true)
    @Mapping(target = "totalTaxableAmount", ignore = true)
    @Mapping(target = "totalCgst", ignore = true)
    @Mapping(target = "totalSgst", ignore = true)
    @Mapping(target = "totalIgst", ignore = true)
    @Mapping(target = "roundOff", ignore = true)
    @Mapping(target = "grandTotal", ignore = true)
    @Mapping(target = "amountPaid", ignore = true)
    @Mapping(target = "amountDue", ignore = true)
    @Mapping(target = "isDeleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    PurchaseOrder toEntity(PurchaseOrderRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "orderNumber", ignore = true)
    @Mapping(target = "orderDate", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "paymentStatus", ignore = true)
    @Mapping(target = "invoiceNumber", ignore = true)
    @Mapping(target = "invoiceDate", ignore = true)
    @Mapping(target = "totalAmount", ignore = true)
    @Mapping(target = "totalGstAmount", ignore = true)
    @Mapping(target = "totalTaxableAmount", ignore = true)
    @Mapping(target = "totalCgst", ignore = true)
    @Mapping(target = "totalSgst", ignore = true)
    @Mapping(target = "totalIgst", ignore = true)
    @Mapping(target = "roundOff", ignore = true)
    @Mapping(target = "grandTotal", ignore = true)
    @Mapping(target = "amountPaid", ignore = true)
    @Mapping(target = "amountDue", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromRequest(PurchaseOrderRequest request, @MappingTarget PurchaseOrder entity);

    PurchaseOrderResponse toResponse(PurchaseOrder entity);

    @Mapping(target = "gstAmount", ignore = true)
    @Mapping(target = "lineTotal", ignore = true)
    @Mapping(target = "taxableValue", ignore = true)
    @Mapping(target = "cgstPercent", ignore = true)
    @Mapping(target = "cgstAmount", ignore = true)
    @Mapping(target = "sgstPercent", ignore = true)
    @Mapping(target = "sgstAmount", ignore = true)
    @Mapping(target = "igstPercent", ignore = true)
    @Mapping(target = "igstAmount", ignore = true)
    PurchaseItem toItemEntity(PurchaseItemRequest request);

    PurchaseItemResponse toItemResponse(PurchaseItem entity);
}