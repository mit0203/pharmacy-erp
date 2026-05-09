package com.sygnusbiotech.pharmacyerp.admin.dto;

import com.sygnusbiotech.pharmacyerp.core.security.RoleType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
public class AdminUserResponse {
    private String id;
    private String username;
    private String email;
    private Set<RoleType> roles;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastLoginAt;
}