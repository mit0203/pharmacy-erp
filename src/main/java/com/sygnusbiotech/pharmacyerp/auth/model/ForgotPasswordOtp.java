package com.sygnusbiotech.pharmacyerp.auth.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "forgot_password_otps")
public class ForgotPasswordOtp {

    @Id
    private String id;

    @Indexed
    private String email;

    private String otp;

    private boolean verified;

    private boolean used;

    private LocalDateTime expiresAt;

    @CreatedDate
    private LocalDateTime createdAt;
}