package com.sygnusbiotech.pharmacyerp.sales.dto;

import com.sygnusbiotech.pharmacyerp.sales.model.CustomerStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CustomerResponse {

    private String id;
    private String name;
    private String phone;
    private String email;
    private String address;
    private String gstNumber;
    private String dlNumber;
    private String state;
    private String stateCode;
    private CustomerStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
