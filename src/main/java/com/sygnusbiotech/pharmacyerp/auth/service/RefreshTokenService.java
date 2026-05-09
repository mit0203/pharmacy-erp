package com.sygnusbiotech.pharmacyerp.auth.service;

import com.sygnusbiotech.pharmacyerp.auth.model.RefreshToken;
import com.sygnusbiotech.pharmacyerp.auth.model.User;
import com.sygnusbiotech.pharmacyerp.auth.repository.RefreshTokenRepository;
import com.sygnusbiotech.pharmacyerp.auth.repository.UserRepository;
import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final com.sygnusbiotech.pharmacyerp.auth.security.JwtProperties jwtProperties;

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    @Transactional
    public RefreshToken createRefreshToken(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        // Delete existing refresh tokens for rotation clean-up
        refreshTokenRepository.deleteByUser(user);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .expiryDate(Instant.now().plusMillis(jwtProperties.getExpiration() * 2L)) // Typically longer than JWT
                .token(UUID.randomUUID().toString())
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(token);
            throw new BusinessException("Refresh token was expired. Please make a new signin request", HttpStatus.FORBIDDEN);
        }
        return token;
    }

    @Transactional
    public RefreshToken rotateToken(String inputTokenStr) {
        RefreshToken expiredToken = findByToken(inputTokenStr)
                .orElseThrow(() -> new BusinessException("Refresh token is not in database!", HttpStatus.FORBIDDEN));

        verifyExpiration(expiredToken);
        String userId = expiredToken.getUser().getId();
        
        // Delete the used token immediately
        refreshTokenRepository.delete(expiredToken);

        // Generate the new rotated token
        return createRefreshToken(userId);
    }

    @Transactional
    public void deleteByUserId(String userId) {
        userRepository.findById(userId).ifPresent(refreshTokenRepository::deleteByUser);
    }
}
