package com.sygnusbiotech.pharmacyerp.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AuditLogResponse {
    private String id;
    private String action;
    private String description;
    private LocalDateTime createdAt;
}