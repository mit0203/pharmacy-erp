package com.sygnusbiotech.pharmacyerp.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sygnusbiotech.pharmacyerp.core.dto.ApiResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
public class AuthEntryPointJwt implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException, ServletException {
        
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        ApiResponse<Void> body = ApiResponse.<Void>builder()
                .timestamp(LocalDateTime.now())
                .status(HttpServletResponse.SC_UNAUTHORIZED)
                .message("Unauthorized Request: " + authException.getMessage())
                .build();

        final ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules(); // Ensure dates parse correctly
        mapper.writeValue(response.getOutputStream(), body);
    }
}
