package com.sygnusbiotech.pharmacyerp.auth.repository;

import com.sygnusbiotech.pharmacyerp.auth.model.RefreshToken;
import com.sygnusbiotech.pharmacyerp.auth.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends MongoRepository<RefreshToken, String> {
    Optional<RefreshToken> findByToken(String token);
    void deleteByUser(User user);
    void deleteByToken(String token);
}
