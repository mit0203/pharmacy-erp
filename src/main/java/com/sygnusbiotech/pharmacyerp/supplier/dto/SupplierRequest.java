package com.sygnusbiotech.pharmacyerp.supplier.dto;

import com.sygnusbiotech.pharmacyerp.supplier.model.SupplierStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class SupplierRequest {

    @NotBlank(message = "Supplier name is required")
    private String name;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be 10 digits")
    private String phone;

    @Email(message = "Please provide a valid email address")
    private String email;

    private String address;

    @NotBlank(message = "GST Number is required")
    @Pattern(
            regexp = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$",
            message = "Invalid GST Number format"
    )
    private String gstNumber;

    // Optional pharmacy fields
    private String dlNumber;
    private String state;
    private String stateCode;

    @NotNull(message = "Status cannot be null")
    private SupplierStatus status;
}