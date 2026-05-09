package com.sygnusbiotech.pharmacyerp.admin.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "audit_logs")
public class AuditLog {

    @Id
    private String id;

    private String action;
    private String description;
    private String actorUserId;
    private String actorUsername;
    private String targetUserId;
    private String targetUsername;
    private LocalDateTime createdAt;
}