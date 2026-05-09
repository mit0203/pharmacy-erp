package com.sygnusbiotech.pharmacyerp.auth.controller;

import com.sygnusbiotech.pharmacyerp.auth.dto.AuthResponse;
import com.sygnusbiotech.pharmacyerp.auth.dto.ChangePasswordRequest;
import com.sygnusbiotech.pharmacyerp.auth.dto.LoginRequest;
import com.sygnusbiotech.pharmacyerp.auth.dto.RegisterRequest;
import com.sygnusbiotech.pharmacyerp.auth.dto.TokenRefreshRequest;
import com.sygnusbiotech.pharmacyerp.auth.dto.UpdateProfileRequest;
import com.sygnusbiotech.pharmacyerp.auth.model.User;
import com.sygnusbiotech.pharmacyerp.auth.security.UserDetailsImpl;
import com.sygnusbiotech.pharmacyerp.auth.service.AuthService;
import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        authService.registerUser(registerRequest);
        return ResponseEntity.ok(ApiResponse.success("User registered successfully!", "Registration successful"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        AuthResponse response = authService.authenticateUser(loginRequest);
        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@Valid @RequestBody TokenRefreshRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Token refreshed successfully"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logoutUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            String userId = ((UserDetailsImpl) principal).getId();
            authService.logoutUser(userId);
        }

        return ResponseEntity.ok(ApiResponse.success(null, "Log out successful"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<User>> getMyProfile() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String userId = ((UserDetailsImpl) principal).getId();
        User user = authService.getCurrentUser(userId);
        return ResponseEntity.ok(ApiResponse.success(user, "Profile loaded successfully"));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<User>> updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String userId = ((UserDetailsImpl) principal).getId();
        User user = authService.updateCurrentUser(userId, request);
        return ResponseEntity.ok(ApiResponse.success(user, "Profile updated successfully"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String userId = ((UserDetailsImpl) principal).getId();
        authService.changePassword(userId, request);
        return ResponseEntity.ok(ApiResponse.success(null, "Password changed successfully"));
    }
}