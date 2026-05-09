package com.sygnusbiotech.pharmacyerp.supplier.dto;

import com.sygnusbiotech.pharmacyerp.supplier.model.SupplierStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SupplierResponse {
    private String id;
    private String name;
    private String phone;
    private String email;
    private String address;
    private String gstNumber;
    private String dlNumber;
    private String state;
    private String stateCode;
    private SupplierStatus status;
    private boolean softDeletedAlert; // Aliased from deleted flag
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
