package com.sygnusbiotech.pharmacyerp.auth.dto.validation;

import com.sygnusbiotech.pharmacyerp.auth.dto.RegisterRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordMatchesValidator implements ConstraintValidator<PasswordMatches, RegisterRequest> {
    @Override
    public boolean isValid(RegisterRequest request, ConstraintValidatorContext context) {
        return request.getPassword() != null && request.getPassword().equals(request.getConfirmPassword());
    }
}
