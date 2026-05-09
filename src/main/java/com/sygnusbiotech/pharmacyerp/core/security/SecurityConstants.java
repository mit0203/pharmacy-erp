package com.sygnusbiotech.pharmacyerp.core.security;

public class SecurityConstants {
    // JWT Secrets and Expiration should be injected from application properties
    public static final String ROLES_CLAIM = "roles";
    public static final String AUTHORIZATION_HEADER = "Authorization";
    public static final String BEARER_PREFIX = "Bearer ";
}
