package com.sygnusbiotech.pharmacyerp.settings.controller;

import com.sygnusbiotech.pharmacyerp.settings.dto.SettingsRequest;
import com.sygnusbiotech.pharmacyerp.settings.dto.SettingsResponse;
import com.sygnusbiotech.pharmacyerp.settings.service.AppSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class AppSettingsController {

    private final AppSettingsService service;

    private Map<String, Object> wrap(SettingsResponse data) {
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", data);
        return res;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER','PHARMACIST')")
    public ResponseEntity<?> getSettings() {
        return ResponseEntity.ok(wrap(service.getSettings()));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public ResponseEntity<?> updateSettings(@Valid @RequestBody SettingsRequest request) {
        return ResponseEntity.ok(wrap(service.updateSettings(request)));
    }

    @PostMapping("/reset")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public ResponseEntity<?> resetSettings() {
        return ResponseEntity.ok(wrap(service.resetSettings()));
    }
}