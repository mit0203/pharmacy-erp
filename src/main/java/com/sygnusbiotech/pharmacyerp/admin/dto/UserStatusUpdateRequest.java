package com.sygnusbiotech.pharmacyerp.admin.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserStatusUpdateRequest {

    @NotNull(message = "Active status is required")
    private Boolean active;
}