package com.sygnusbiotech.pharmacyerp.auth.dto;

import com.sygnusbiotech.pharmacyerp.core.security.RoleType;
import lombok.Builder;
import lombok.Data;

import java.util.Set;

@Data
@Builder
public class AuthResponse {
    private String token;
    private String type;
    private String refreshToken;
    private String id;
    private String username;
    private String email;
    private Set<RoleType> roles;
}
