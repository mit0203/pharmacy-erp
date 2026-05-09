package com.sygnusbiotech.pharmacyerp.settings.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SettingsResponse {
    private String id;
    private Appearance appearance;
    private Business business;
    private Inventory inventory;
    private Invoices invoices;
    private Notifications notifications;
    private Security security;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class Appearance {
        private String theme;
        private boolean compactMode;
        private boolean showQuickActions;
        private boolean showWelcomeBanner;
    }

    @Data
    @Builder
    public static class Business {
        private String companyName;
        private String companyEmail;
        private String companyPhone;
        private String companyAddress;
        private String gstin;
        private String drugLicenseNumber;
        private String stateCode;
        private String state;
        private String bankName;
        private String bankAccountNumber;
        private String bankIfscCode;
        private String bankBranch;
        private String currency;
        private String timezone;
        private String taxMode;
    }

    @Data
    @Builder
    public static class Inventory {
        private Integer lowStockThreshold;
        private Integer nearExpiryDays;
        private boolean allowNegativeStock;
        private boolean autoFocusBatchOnReceive;
    }

    @Data
    @Builder
    public static class Invoices {
        private String purchasePrefix;
        private String salesPrefix;
        private String invoicePrefix;
        private boolean showCompanyDetails;
        private boolean showFooterNote;
        private String footerNote;
        private String termsAndConditions;
        private String jurisdiction;
    }

    @Data
    @Builder
    public static class Notifications {
        private boolean emailAlerts;
        private boolean lowStockAlerts;
        private boolean expiryAlerts;
        private boolean paymentAlerts;
        private boolean soundEffects;
    }

    @Data
    @Builder
    public static class Security {
        private Integer sessionTimeoutMinutes;
        private boolean requireActionConfirmations;
        private boolean maskSensitiveFinancials;
    }
}
