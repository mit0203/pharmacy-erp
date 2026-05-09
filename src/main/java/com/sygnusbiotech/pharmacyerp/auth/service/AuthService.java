package com.sygnusbiotech.pharmacyerp.auth.service;

import com.sygnusbiotech.pharmacyerp.auth.dto.*;
import com.sygnusbiotech.pharmacyerp.auth.model.RefreshToken;
import com.sygnusbiotech.pharmacyerp.auth.model.User;
import com.sygnusbiotech.pharmacyerp.auth.repository.UserRepository;
import com.sygnusbiotech.pharmacyerp.auth.security.JwtUtils;
import com.sygnusbiotech.pharmacyerp.auth.security.UserDetailsImpl;
import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import com.sygnusbiotech.pharmacyerp.core.security.RoleType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder encoder;
    private final JwtUtils jwtUtils;
    private final RefreshTokenService refreshTokenService;

    @Transactional
    public User registerUser(RegisterRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            throw new BusinessException("Username is already taken!", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new BusinessException("Email is already in use!", HttpStatus.CONFLICT);
        }

        LocalDateTime now = LocalDateTime.now();

        User user = User.builder()
                .username(signUpRequest.getUsername())
                .email(signUpRequest.getEmail().trim().toLowerCase())
                .password(encoder.encode(signUpRequest.getPassword()))
                .roles(Collections.singleton(RoleType.PHARMACIST))
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .lastLoginAt(null) // ✅ optional init
                .build();

        return userRepository.save(user);
    }

    public AuthResponse authenticateUser(LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsernameOrEmail(),
                            loginRequest.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

            String jwt = jwtUtils.generateJwtToken(userDetails);
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(userDetails.getId());

            // ✅ GET USER
            User user = userRepository.findById(userDetails.getId()).orElseThrow();

            // ===============================
            // ✅ IMPORTANT FIX (LAST LOGIN)
            // ===============================
            user.setLastLoginAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            user = userRepository.save(user);
            // ===============================

            return AuthResponse.builder()
                    .token(jwt)
                    .type("Bearer")
                    .refreshToken(refreshToken.getToken())
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .roles(user.getRoles())
                    .build();

        } catch (DisabledException ex) {
            throw new BusinessException("Your account is disabled. Please contact an administrator.", HttpStatus.FORBIDDEN);
        }
    }

    @Transactional
    public AuthResponse refreshToken(TokenRefreshRequest request) {
        RefreshToken newRefreshToken = refreshTokenService.rotateToken(request.getRefreshToken());
        User user = newRefreshToken.getUser();

        if (!user.isActive()) {
            refreshTokenService.deleteByUserId(user.getId());
            throw new BusinessException("Your account is disabled. Please contact an administrator.", HttpStatus.FORBIDDEN);
        }

        String jwt = jwtUtils.generateJwtToken(UserDetailsImpl.build(user));

        return AuthResponse.builder()
                .token(jwt)
                .type("Bearer")
                .refreshToken(newRefreshToken.getToken())
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .roles(user.getRoles())
                .build();
    }

    @Transactional
    public void logoutUser(String userId) {
        refreshTokenService.deleteByUserId(userId);
    }

    public User getCurrentUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public User updateCurrentUser(String userId, UpdateProfileRequest request) {
        User existingUser = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        String nextUsername = request.getUsername().trim();
        String nextEmail = request.getEmail().trim().toLowerCase();

        if (!existingUser.getUsername().equalsIgnoreCase(nextUsername)
                && Boolean.TRUE.equals(userRepository.existsByUsername(nextUsername))) {
            throw new BusinessException("Username is already taken!", HttpStatus.CONFLICT);
        }

        if (!existingUser.getEmail().equalsIgnoreCase(nextEmail)
                && Boolean.TRUE.equals(userRepository.existsByEmail(nextEmail))) {
            throw new BusinessException("Email is already in use!", HttpStatus.CONFLICT);
        }

        existingUser.setUsername(nextUsername);
        existingUser.setEmail(nextEmail);
        existingUser.setUpdatedAt(LocalDateTime.now());

        return userRepository.save(existingUser);
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User existingUser = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        String currentPassword = request.getCurrentPassword();
        String newPassword = request.getNewPassword();
        String confirmPassword = request.getConfirmPassword();

        if (!encoder.matches(currentPassword, existingUser.getPassword())) {
            throw new BusinessException("Current password is incorrect", HttpStatus.BAD_REQUEST);
        }

        if (!newPassword.equals(confirmPassword)) {
            throw new BusinessException("New password and confirm password do not match", HttpStatus.BAD_REQUEST);
        }

        if (currentPassword.equals(newPassword)) {
            throw new BusinessException("New password must be different from current password", HttpStatus.BAD_REQUEST);
        }

        existingUser.setPassword(encoder.encode(newPassword));
        existingUser.setUpdatedAt(LocalDateTime.now());
        userRepository.save(existingUser);

        refreshTokenService.deleteByUserId(userId);
    }
}