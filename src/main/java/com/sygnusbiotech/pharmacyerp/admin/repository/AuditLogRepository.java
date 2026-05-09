package com.sygnusbiotech.pharmacyerp.admin.repository;

import com.sygnusbiotech.pharmacyerp.admin.model.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    List<AuditLog> findTop50ByOrderByCreatedAtDesc();
}