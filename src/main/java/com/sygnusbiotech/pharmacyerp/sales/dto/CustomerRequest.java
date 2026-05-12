package com.sygnusbiotech.pharmacyerp.sales.dto;

import com.sygnusbiotech.pharmacyerp.sales.model.CustomerStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CustomerRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be 10 digits")
    private String phone;

    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Address is required")
    private String address;

    // Optional because normal customers may not have GST
    private String gstNumber;

    // Optional pharmacy fields
    private String dlNumber;
    private String state;
    private String stateCode;

    @NotNull(message = "Status cannot be null")
    private CustomerStatus status;
}
