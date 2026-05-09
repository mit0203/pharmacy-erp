package com.sygnusbiotech.pharmacyerp.purchase.dto;

import com.sygnusbiotech.pharmacyerp.purchase.model.PaymentStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentUpdateRequest {

    @NotNull(message = "Payment status is required")
    private PaymentStatus paymentStatus;

    @DecimalMin(value = "0.0", inclusive = true, message = "Amount paid cannot be negative")
    private BigDecimal amountPaid;
}