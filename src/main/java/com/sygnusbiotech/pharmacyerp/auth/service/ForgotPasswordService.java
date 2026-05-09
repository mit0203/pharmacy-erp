package com.sygnusbiotech.pharmacyerp.auth.service;

import com.sygnusbiotech.pharmacyerp.auth.dto.ForgotPasswordResetRequest;
import com.sygnusbiotech.pharmacyerp.auth.dto.ForgotPasswordSendOtpRequest;
import com.sygnusbiotech.pharmacyerp.auth.dto.ForgotPasswordVerifyOtpRequest;
import com.sygnusbiotech.pharmacyerp.auth.model.ForgotPasswordOtp;
import com.sygnusbiotech.pharmacyerp.auth.model.User;
import com.sygnusbiotech.pharmacyerp.auth.repository.ForgotPasswordOtpRepository;
import com.sygnusbiotech.pharmacyerp.auth.repository.UserRepository;
import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ForgotPasswordService {

    private final UserRepository userRepository;
    private final ForgotPasswordOtpRepository forgotPasswordOtpRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.otp.expiry-minutes:10}")
    private long otpExpiryMinutes;

    @Value("${app.mail.from}")
    private String fromEmail;

    public void sendOtp(ForgotPasswordSendOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("No user found with this email.", HttpStatus.NOT_FOUND));

        invalidateOldOtps(email);

        String otp = generateOtp();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(otpExpiryMinutes);

        ForgotPasswordOtp otpDocument = ForgotPasswordOtp.builder()
                .email(email)
                .otp(otp)
                .verified(false)
                .used(false)
                .expiresAt(expiresAt)
                .build();

        forgotPasswordOtpRepository.save(otpDocument);
        sendOtpEmail(user.getEmail(), otp);
    }

    public void verifyOtp(ForgotPasswordVerifyOtpRequest request) {
        ForgotPasswordOtp otpRecord = getValidOtpRecord(
                request.getEmail().trim().toLowerCase(),
                request.getOtp().trim()
        );

        otpRecord.setVerified(true);
        forgotPasswordOtpRepository.save(otpRecord);
    }

    public void resetPassword(ForgotPasswordResetRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String otp = request.getOtp().trim();

        ForgotPasswordOtp otpRecord = getValidOtpRecord(email, otp);

        if (!otpRecord.isVerified()) {
            throw new BusinessException("OTP is not verified.", HttpStatus.BAD_REQUEST);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("No user found with this email.", HttpStatus.NOT_FOUND));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        otpRecord.setUsed(true);
        forgotPasswordOtpRepository.save(otpRecord);
    }

    private ForgotPasswordOtp getValidOtpRecord(String email, String otp) {
        ForgotPasswordOtp otpRecord = forgotPasswordOtpRepository
                .findTopByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new BusinessException("OTP not found.", HttpStatus.BAD_REQUEST));

        if (otpRecord.isUsed()) {
            throw new BusinessException("OTP has already been used.", HttpStatus.BAD_REQUEST);
        }

        if (otpRecord.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("OTP has expired.", HttpStatus.BAD_REQUEST);
        }

        if (!otpRecord.getOtp().equals(otp)) {
            throw new BusinessException("Invalid OTP.", HttpStatus.BAD_REQUEST);
        }

        return otpRecord;
    }

    private void invalidateOldOtps(String email) {
        List<ForgotPasswordOtp> otpList = forgotPasswordOtpRepository.findByEmail(email);
        for (ForgotPasswordOtp otp : otpList) {
            otp.setUsed(true);
        }
        forgotPasswordOtpRepository.saveAll(otpList);
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int number = 100000 + random.nextInt(900000);
        return String.valueOf(number);
    }

    private void sendOtpEmail(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("Sygnus Biotech ERP - Password Reset OTP");
        message.setText(
                "Hello,\n\n" +
                        "Your password reset OTP is: " + otp + "\n\n" +
                        "This OTP is valid for " + otpExpiryMinutes + " minutes.\n" +
                        "Do not share this OTP with anyone.\n\n" +
                        "Regards,\nSygnus Biotech ERP"
        );

        mailSender.send(message);
    }
}