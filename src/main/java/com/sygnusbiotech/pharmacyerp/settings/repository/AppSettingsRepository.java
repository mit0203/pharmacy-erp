package com.sygnusbiotech.pharmacyerp.settings.repository;

import com.sygnusbiotech.pharmacyerp.settings.model.AppSettings;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AppSettingsRepository extends MongoRepository<AppSettings, String> {
    Optional<AppSettings> findFirstByOrderByCreatedAtAsc();
}
