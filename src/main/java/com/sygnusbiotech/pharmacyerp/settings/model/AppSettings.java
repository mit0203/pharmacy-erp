package com.sygnusbiotech.pharmacyerp.settings.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "app_settings")
@JsonIgnoreProperties(ignoreUnknown = true)
public class AppSettings {

    @Id
    private String id;

    private Appearance appearance = new Appearance();
    private Business business = new Business();
    private Inventory inventory = new Inventory();
    private Invoices invoices = new Invoices();
    private Notifications notifications = new Notifications();
    private Security security = new Security();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Appearance {
        private String theme = "light";
        private boolean compactMode = false;
        private boolean showQuickActions = true;
        private boolean showWelcomeBanner = true;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Business {
        private String companyName = "Sygnus Biotech";
        private String companyEmail = "info@sygnusbiotech.com";
        private String companyPhone = "+91 98765 43210";
        private String companyAddress = "123 Pharma Street, Medical District, Mumbai, Maharashtra - 400001";
        private String gstin = "27AABCS1429B1Z5";
        private String drugLicenseNumber = "MH/DL/20B/12345";
        private String stateCode = "27";
        private String state = "Maharashtra";
        private String bankName = "State Bank of India";
        private String bankAccountNumber = "1234567890123";
        private String bankIfscCode = "SBIN0001234";
        private String bankBranch = "Medical District Branch";
        private String currency = "INR";
        private String timezone = "Asia/Kolkata";
        private String taxMode = "GST";
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Inventory {
        private Integer lowStockThreshold = 10;
        private Integer nearExpiryDays = 30;
        private boolean allowNegativeStock = false;
        private boolean autoFocusBatchOnReceive = true;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Invoices {
        private String purchasePrefix = "PO";
        private String salesPrefix = "SO";
        private String invoicePrefix = "INV";
        private boolean showCompanyDetails = true;
        private boolean showFooterNote = true;
        private String footerNote = "Thank you";
        private String termsAndConditions = "1. Goods once sold will not be taken back.\n2. Interest @18% will be charged on overdue bills.\n3. All disputes subject to local jurisdiction only.\n4. E&OE - Errors and Omissions Excepted.";
        private String jurisdiction = "Mumbai";
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Notifications {
        private boolean emailAlerts = true;
        private boolean lowStockAlerts = true;
        private boolean expiryAlerts = true;
        private boolean paymentAlerts = true;
        private boolean soundEffects = false;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Security {
        private Integer sessionTimeoutMinutes = 60;
        private boolean requireActionConfirmations = true;
        private boolean maskSensitiveFinancials = false;
    }
}