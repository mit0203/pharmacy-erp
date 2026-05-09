package com.sygnusbiotech.pharmacyerp.auth.repository;

import com.sygnusbiotech.pharmacyerp.auth.model.ForgotPasswordOtp;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ForgotPasswordOtpRepository extends MongoRepository<ForgotPasswordOtp, String> {

    Optional<ForgotPasswordOtp> findTopByEmailOrderByCreatedAtDesc(String email);

    List<ForgotPasswordOtp> findByEmail(String email);
}