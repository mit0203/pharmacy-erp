package com.sygnusbiotech.pharmacyerp.admin.controller;

import com.sygnusbiotech.pharmacyerp.admin.dto.AdminUserResponse;
import com.sygnusbiotech.pharmacyerp.admin.dto.AuditLogResponse;
import com.sygnusbiotech.pharmacyerp.admin.dto.UserRoleUpdateRequest;
import com.sygnusbiotech.pharmacyerp.admin.dto.UserStatusUpdateRequest;
import com.sygnusbiotech.pharmacyerp.admin.service.AdminService;
import com.sygnusbiotech.pharmacyerp.auth.security.UserDetailsImpl;
import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<AdminUserResponse>>> getAllUsers() {
        return ResponseEntity.ok(
                ApiResponse.success(adminService.getAllUsers(), "Users loaded successfully")
        );
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUserRole(
            @PathVariable String id,
            @Valid @RequestBody UserRoleUpdateRequest request
    ) {
        String actorUserId = ((UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal()).getId();

        return ResponseEntity.ok(
                ApiResponse.success(
                        adminService.updateUserRole(actorUserId, id, request),
                        "User role updated successfully"
                )
        );
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUserStatus(
            @PathVariable String id,
            @Valid @RequestBody UserStatusUpdateRequest request
    ) {
        String actorUserId = ((UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal()).getId();

        return ResponseEntity.ok(
                ApiResponse.success(
                        adminService.updateUserStatus(actorUserId, id, request),
                        "User status updated successfully"
                )
        );
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getAuditLogs() {
        return ResponseEntity.ok(
                ApiResponse.success(adminService.getAuditLogs(), "Audit logs loaded successfully")
        );
    }
}