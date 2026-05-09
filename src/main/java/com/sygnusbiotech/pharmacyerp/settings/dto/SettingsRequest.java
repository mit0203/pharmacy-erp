package com.sygnusbiotech.pharmacyerp.settings.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SettingsRequest {

    @Valid
    private Appearance appearance = new Appearance();

    @Valid
    private Business business = new Business();

    @Valid
    private Inventory inventory = new Inventory();

    @Valid
    private Invoices invoices = new Invoices();

    @Valid
    private Notifications notifications = new Notifications();

    @Valid
    private Security security = new Security();

    @Data
    public static class Appearance {
        @NotBlank(message = "Theme is required")
        private String theme = "light";
        private boolean compactMode = false;
        private boolean showQuickActions = true;
        private boolean showWelcomeBanner = true;
    }

    @Data
    public static class Business {
        @NotBlank(message = "Company name is required")
        private String companyName = "Sygnus Biotech";

        @NotBlank(message = "Company email is required")
        private String companyEmail = "info@sygnusbiotech.com";

        @NotBlank(message = "Company phone is required")
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

        @NotBlank(message = "Currency is required")
        private String currency = "INR";

        @NotBlank(message = "Timezone is required")
        private String timezone = "Asia/Kolkata";

        @NotBlank(message = "Tax mode is required")
        private String taxMode = "GST";
    }

    @Data
    public static class Inventory {
        @Min(value = 0, message = "Low stock threshold cannot be negative")
        private Integer lowStockThreshold = 10;

        @Min(value = 0, message = "Near expiry days cannot be negative")
        private Integer nearExpiryDays = 30;

        private boolean allowNegativeStock = false;
        private boolean autoFocusBatchOnReceive = true;
    }

    @Data
    public static class Invoices {
        @NotBlank(message = "Purchase prefix is required")
        private String purchasePrefix = "PO";

        @NotBlank(message = "Sales prefix is required")
        private String salesPrefix = "SO";

        @NotBlank(message = "Invoice prefix is required")
        private String invoicePrefix = "INV";

        private boolean showCompanyDetails = true;
        private boolean showFooterNote = true;
        private String footerNote = "Thank you for choosing Sygnus Biotech.";
        private String termsAndConditions = "1. Goods once sold will not be taken back.\n2. Interest @18% will be charged on overdue bills.\n3. All disputes subject to local jurisdiction only.\n4. E&OE - Errors and Omissions Excepted.";
        private String jurisdiction = "Mumbai";
    }

    @Data
    public static class Notifications {
        private boolean emailAlerts = true;
        private boolean lowStockAlerts = true;
        private boolean expiryAlerts = true;
        private boolean paymentAlerts = true;
        private boolean soundEffects = false;
    }

    @Data
    public static class Security {
        @Min(value = 1, message = "Session timeout must be at least 1 minute")
        private Integer sessionTimeoutMinutes = 60;

        private boolean requireActionConfirmations = true;
        private boolean maskSensitiveFinancials = false;
    }
}
