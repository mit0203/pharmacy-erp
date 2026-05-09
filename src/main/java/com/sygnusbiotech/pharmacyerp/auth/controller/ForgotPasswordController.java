package com.sygnusbiotech.pharmacyerp.auth.controller;

import com.sygnusbiotech.pharmacyerp.auth.dto.ForgotPasswordResetRequest;
import com.sygnusbiotech.pharmacyerp.auth.dto.ForgotPasswordSendOtpRequest;
import com.sygnusbiotech.pharmacyerp.auth.dto.ForgotPasswordVerifyOtpRequest;
import com.sygnusbiotech.pharmacyerp.auth.service.ForgotPasswordService;
import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/forgot-password")
@RequiredArgsConstructor
public class ForgotPasswordController {

    private final ForgotPasswordService forgotPasswordService;

    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse<String>> sendOtp(@Valid @RequestBody ForgotPasswordSendOtpRequest request) {
        forgotPasswordService.sendOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP sent successfully.", "OTP sent successfully"));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<String>> verifyOtp(@Valid @RequestBody ForgotPasswordVerifyOtpRequest request) {
        forgotPasswordService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP verified successfully.", "OTP verified successfully"));
    }

    @PostMapping("/reset")
    public ResponseEntity<ApiResponse<String>> resetPassword(@Valid @RequestBody ForgotPasswordResetRequest request) {
        forgotPasswordService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully.", "Password reset successfully"));
    }
}