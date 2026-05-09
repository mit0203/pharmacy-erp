package com.sygnusbiotech.pharmacyerp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TokenRefreshRequest {
    @NotBlank(message = "Refresh Token is required")
    private String refreshToken;
}
