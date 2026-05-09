package com.sygnusbiotech.pharmacyerp.reports.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpiryReportResponse {
    private int days;
    private long expiringSoonCount;
    private long expiredCount;
    private List<ExpiryReportItem> expiringSoon;
    private List<ExpiryReportItem> expired;
}
