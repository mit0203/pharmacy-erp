package com.sygnusbiotech.pharmacyerp.admin.service;

import com.sygnusbiotech.pharmacyerp.admin.dto.AdminUserResponse;
import com.sygnusbiotech.pharmacyerp.admin.dto.AuditLogResponse;
import com.sygnusbiotech.pharmacyerp.admin.dto.UserRoleUpdateRequest;
import com.sygnusbiotech.pharmacyerp.admin.dto.UserStatusUpdateRequest;
import com.sygnusbiotech.pharmacyerp.admin.model.AuditLog;
import com.sygnusbiotech.pharmacyerp.admin.repository.AuditLogRepository;
import com.sygnusbiotech.pharmacyerp.auth.model.User;
import com.sygnusbiotech.pharmacyerp.auth.repository.UserRepository;
import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import com.sygnusbiotech.pharmacyerp.core.security.RoleType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(User::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toUserResponse)
                .toList();
    }

    public List<AuditLogResponse> getAuditLogs() {
        return auditLogRepository.findTop50ByOrderByCreatedAtDesc()
                .stream()
                .map(log -> AuditLogResponse.builder()
                        .id(log.getId())
                        .action(log.getAction())
                        .description(log.getDescription())
                        .createdAt(log.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public AdminUserResponse updateUserRole(String actorUserId, String targetUserId, UserRoleUpdateRequest request) {
        User actor = getUserOrThrow(actorUserId);
        User target = getUserOrThrow(targetUserId);

        RoleType nextRole = parseRole(request.getRole());

        target.setRoles(Set.of(nextRole));
        target.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(target);

        saveAudit(
                "Role Updated",
                actor,
                target,
                actor.getUsername() + " changed role of " + target.getUsername() + " to " + nextRole.name()
        );

        return toUserResponse(saved);
    }

    @Transactional
    public AdminUserResponse updateUserStatus(String actorUserId, String targetUserId, UserStatusUpdateRequest request) {
        User actor = getUserOrThrow(actorUserId);
        User target = getUserOrThrow(targetUserId);

        if (actor.getId().equals(target.getId()) && Boolean.FALSE.equals(request.getActive())) {
            throw new BusinessException("You cannot disable your own account", HttpStatus.BAD_REQUEST);
        }

        long activeAdminCount = userRepository.findAll()
                .stream()
                .filter(User::isActive)
                .filter(u -> u.getRoles() != null && u.getRoles().contains(RoleType.ADMIN))
                .count();

        boolean targetIsAdmin = target.getRoles() != null && target.getRoles().contains(RoleType.ADMIN);

        if (targetIsAdmin && Boolean.FALSE.equals(request.getActive()) && activeAdminCount <= 1) {
            throw new BusinessException("At least one active ADMIN must remain in the system", HttpStatus.BAD_REQUEST);
        }

        target.setActive(request.getActive());
        target.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(target);

        saveAudit(
                request.getActive() ? "User Activated" : "User Disabled",
                actor,
                target,
                actor.getUsername() + " " +
                        (request.getActive() ? "activated " : "disabled ") +
                        target.getUsername()
        );

        return toUserResponse(saved);
    }

    private User getUserOrThrow(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));
    }

    private RoleType parseRole(String rawRole) {
        try {
            return RoleType.valueOf(rawRole.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BusinessException("Invalid role value", HttpStatus.BAD_REQUEST);
        }
    }

    // ✅ FIXED METHOD (IMPORTANT)
    private AdminUserResponse toUserResponse(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .roles(user.getRoles())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())

               
                .lastLoginAt(user.getLastLoginAt())

                .build();
    }

    private void saveAudit(String action, User actor, User target, String description) {
        auditLogRepository.save(
                AuditLog.builder()
                        .action(action)
                        .description(description)
                        .actorUserId(actor.getId())
                        .actorUsername(actor.getUsername())
                        .targetUserId(target != null ? target.getId() : null)
                        .targetUsername(target != null ? target.getUsername() : null)
                        .createdAt(LocalDateTime.now())
                        .build()
        );
    }
}