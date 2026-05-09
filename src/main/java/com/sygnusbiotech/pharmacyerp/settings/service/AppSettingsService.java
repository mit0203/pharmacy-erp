package com.sygnusbiotech.pharmacyerp.settings.service;

import com.sygnusbiotech.pharmacyerp.settings.dto.SettingsRequest;
import com.sygnusbiotech.pharmacyerp.settings.dto.SettingsResponse;
import com.sygnusbiotech.pharmacyerp.settings.model.AppSettings;
import com.sygnusbiotech.pharmacyerp.settings.repository.AppSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AppSettingsService {

    private final AppSettingsRepository repo;

    public SettingsResponse getSettings() {
        AppSettings settings = getOrCreateSettings();
        return toResponse(settings);
    }

    public SettingsResponse updateSettings(SettingsRequest request) {
        AppSettings existing = getOrCreateSettings();

        mergeAppearance(existing, request);
        mergeBusiness(existing, request);
        mergeInventory(existing, request);
        mergeInvoices(existing, request);
        mergeNotifications(existing, request);
        mergeSecurity(existing, request);

        existing.setUpdatedAt(LocalDateTime.now());

        AppSettings saved = repo.save(existing);
        return toResponse(saved);
    }

    public SettingsResponse resetSettings() {
        AppSettings existing = getOrCreateSettings();

        AppSettings fresh = new AppSettings();
        fresh.setId(existing.getId());
        fresh.setCreatedAt(existing.getCreatedAt() != null ? existing.getCreatedAt() : LocalDateTime.now());
        fresh.setUpdatedAt(LocalDateTime.now());

        AppSettings saved = repo.save(fresh);
        return toResponse(saved);
    }

    private AppSettings getOrCreateSettings() {
        return repo.findAll()
                .stream()
                .findFirst()
                .map(this::ensureDefaults)
                .map(this::ensureTimestamps)
                .map(repo::save)
                .orElseGet(() -> {
                    AppSettings fresh = new AppSettings();
                    LocalDateTime now = LocalDateTime.now();
                    fresh.setCreatedAt(now);
                    fresh.setUpdatedAt(now);
                    return repo.save(fresh);
                });
    }

    private AppSettings ensureDefaults(AppSettings settings) {
        if (settings.getAppearance() == null) {
            settings.setAppearance(new AppSettings.Appearance());
        }
        if (settings.getBusiness() == null) {
            settings.setBusiness(new AppSettings.Business());
        }
        if (settings.getInventory() == null) {
            settings.setInventory(new AppSettings.Inventory());
        }
        if (settings.getInvoices() == null) {
            settings.setInvoices(new AppSettings.Invoices());
        }
        if (settings.getNotifications() == null) {
            settings.setNotifications(new AppSettings.Notifications());
        }
        if (settings.getSecurity() == null) {
            settings.setSecurity(new AppSettings.Security());
        }
        return settings;
    }

    private AppSettings ensureTimestamps(AppSettings settings) {
        LocalDateTime now = LocalDateTime.now();

        if (settings.getCreatedAt() == null) {
            settings.setCreatedAt(now);
        }
        if (settings.getUpdatedAt() == null) {
            settings.setUpdatedAt(now);
        }

        return settings;
    }

    private void mergeAppearance(AppSettings existing, SettingsRequest request) {
        SettingsRequest.Appearance src = request.getAppearance();
        if (src == null) {
            return;
        }

        AppSettings.Appearance target = existing.getAppearance();
        if (target == null) {
            target = new AppSettings.Appearance();
            existing.setAppearance(target);
        }

        target.setTheme(src.getTheme());
        target.setCompactMode(src.isCompactMode());
        target.setShowQuickActions(src.isShowQuickActions());
        target.setShowWelcomeBanner(src.isShowWelcomeBanner());
    }

    private void mergeBusiness(AppSettings existing, SettingsRequest request) {
        SettingsRequest.Business src = request.getBusiness();
        if (src == null) {
            return;
        }

        AppSettings.Business target = existing.getBusiness();
        if (target == null) {
            target = new AppSettings.Business();
            existing.setBusiness(target);
        }

        target.setCompanyName(src.getCompanyName());
        target.setCompanyEmail(src.getCompanyEmail());
        target.setCompanyPhone(src.getCompanyPhone());
        target.setCompanyAddress(src.getCompanyAddress());
        target.setGstin(src.getGstin());
        target.setDrugLicenseNumber(src.getDrugLicenseNumber());
        target.setStateCode(src.getStateCode());
        target.setState(src.getState());
        target.setBankName(src.getBankName());
        target.setBankAccountNumber(src.getBankAccountNumber());
        target.setBankIfscCode(src.getBankIfscCode());
        target.setBankBranch(src.getBankBranch());
        target.setCurrency(src.getCurrency());
        target.setTimezone(src.getTimezone());
        target.setTaxMode(src.getTaxMode());
    }

    private void mergeInventory(AppSettings existing, SettingsRequest request) {
        SettingsRequest.Inventory src = request.getInventory();
        if (src == null) {
            return;
        }

        AppSettings.Inventory target = existing.getInventory();
        if (target == null) {
            target = new AppSettings.Inventory();
            existing.setInventory(target);
        }

        target.setLowStockThreshold(src.getLowStockThreshold());
        target.setNearExpiryDays(src.getNearExpiryDays());
        target.setAllowNegativeStock(src.isAllowNegativeStock());
        target.setAutoFocusBatchOnReceive(src.isAutoFocusBatchOnReceive());
    }

    private void mergeInvoices(AppSettings existing, SettingsRequest request) {
        SettingsRequest.Invoices src = request.getInvoices();
        if (src == null) {
            return;
        }

        AppSettings.Invoices target = existing.getInvoices();
        if (target == null) {
            target = new AppSettings.Invoices();
            existing.setInvoices(target);
        }

        target.setPurchasePrefix(src.getPurchasePrefix());
        target.setSalesPrefix(src.getSalesPrefix());
        target.setInvoicePrefix(src.getInvoicePrefix());
        target.setShowCompanyDetails(src.isShowCompanyDetails());
        target.setShowFooterNote(src.isShowFooterNote());
        target.setFooterNote(src.getFooterNote());
        target.setTermsAndConditions(src.getTermsAndConditions());
        target.setJurisdiction(src.getJurisdiction());
    }

    private void mergeNotifications(AppSettings existing, SettingsRequest request) {
        SettingsRequest.Notifications src = request.getNotifications();
        if (src == null) {
            return;
        }

        AppSettings.Notifications target = existing.getNotifications();
        if (target == null) {
            target = new AppSettings.Notifications();
            existing.setNotifications(target);
        }

        target.setEmailAlerts(src.isEmailAlerts());
        target.setLowStockAlerts(src.isLowStockAlerts());
        target.setExpiryAlerts(src.isExpiryAlerts());
        target.setPaymentAlerts(src.isPaymentAlerts());
        target.setSoundEffects(src.isSoundEffects());
    }

    private void mergeSecurity(AppSettings existing, SettingsRequest request) {
        SettingsRequest.Security src = request.getSecurity();
        if (src == null) {
            return;
        }

        AppSettings.Security target = existing.getSecurity();
        if (target == null) {
            target = new AppSettings.Security();
            existing.setSecurity(target);
        }

        target.setSessionTimeoutMinutes(src.getSessionTimeoutMinutes());
        target.setRequireActionConfirmations(src.isRequireActionConfirmations());
        target.setMaskSensitiveFinancials(src.isMaskSensitiveFinancials());
    }

    private SettingsResponse toResponse(AppSettings settings) {
        return SettingsResponse.builder()
                .id(settings.getId())
                .appearance(
                        SettingsResponse.Appearance.builder()
                                .theme(settings.getAppearance().getTheme())
                                .compactMode(settings.getAppearance().isCompactMode())
                                .showQuickActions(settings.getAppearance().isShowQuickActions())
                                .showWelcomeBanner(settings.getAppearance().isShowWelcomeBanner())
                                .build()
                )
                .business(
                        SettingsResponse.Business.builder()
                                .companyName(settings.getBusiness().getCompanyName())
                                .companyEmail(settings.getBusiness().getCompanyEmail())
                                .companyPhone(settings.getBusiness().getCompanyPhone())
                                .companyAddress(settings.getBusiness().getCompanyAddress())
                                .gstin(settings.getBusiness().getGstin())
                                .drugLicenseNumber(settings.getBusiness().getDrugLicenseNumber())
                                .stateCode(settings.getBusiness().getStateCode())
                                .state(settings.getBusiness().getState())
                                .bankName(settings.getBusiness().getBankName())
                                .bankAccountNumber(settings.getBusiness().getBankAccountNumber())
                                .bankIfscCode(settings.getBusiness().getBankIfscCode())
                                .bankBranch(settings.getBusiness().getBankBranch())
                                .currency(settings.getBusiness().getCurrency())
                                .timezone(settings.getBusiness().getTimezone())
                                .taxMode(settings.getBusiness().getTaxMode())
                                .build()
                )
                .inventory(
                        SettingsResponse.Inventory.builder()
                                .lowStockThreshold(settings.getInventory().getLowStockThreshold())
                                .nearExpiryDays(settings.getInventory().getNearExpiryDays())
                                .allowNegativeStock(settings.getInventory().isAllowNegativeStock())
                                .autoFocusBatchOnReceive(settings.getInventory().isAutoFocusBatchOnReceive())
                                .build()
                )
                .invoices(
                        SettingsResponse.Invoices.builder()
                                .purchasePrefix(settings.getInvoices().getPurchasePrefix())
                                .salesPrefix(settings.getInvoices().getSalesPrefix())
                                .invoicePrefix(settings.getInvoices().getInvoicePrefix())
                                .showCompanyDetails(settings.getInvoices().isShowCompanyDetails())
                                .showFooterNote(settings.getInvoices().isShowFooterNote())
                                .footerNote(settings.getInvoices().getFooterNote())
                                .termsAndConditions(settings.getInvoices().getTermsAndConditions())
                                .jurisdiction(settings.getInvoices().getJurisdiction())
                                .build()
                )
                .notifications(
                        SettingsResponse.Notifications.builder()
                                .emailAlerts(settings.getNotifications().isEmailAlerts())
                                .lowStockAlerts(settings.getNotifications().isLowStockAlerts())
                                .expiryAlerts(settings.getNotifications().isExpiryAlerts())
                                .paymentAlerts(settings.getNotifications().isPaymentAlerts())
                                .soundEffects(settings.getNotifications().isSoundEffects())
                                .build()
                )
                .security(
                        SettingsResponse.Security.builder()
                                .sessionTimeoutMinutes(settings.getSecurity().getSessionTimeoutMinutes())
                                .requireActionConfirmations(settings.getSecurity().isRequireActionConfirmations())
                                .maskSensitiveFinancials(settings.getSecurity().isMaskSensitiveFinancials())
                                .build()
                )
                .createdAt(settings.getCreatedAt())
                .updatedAt(settings.getUpdatedAt())
                .build();
    }
}