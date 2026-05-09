package com.sygnusbiotech.pharmacyerp.auth.model;

import com.sygnusbiotech.pharmacyerp.core.security.RoleType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String username;
    private String email;
    private String password;
    private Set<RoleType> roles;

    @Builder.Default
    private boolean active = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ✅ NEW FIELD (IMPORTANT)
    private LocalDateTime lastLoginAt;
}