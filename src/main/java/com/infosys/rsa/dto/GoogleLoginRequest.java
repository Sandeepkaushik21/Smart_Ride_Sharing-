package com.infosys.rsa.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleLoginRequest {
    @NotBlank(message = "Google ID token is required")
    private String idToken;

    private String role; // Optional: DRIVER or PASSENGER (defaults to PASSENGER)
}