package com.infosys.rsa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OtpVerificationRequest {

    @NotBlank(message = "OTP is required")
    @Pattern(regexp = "^\\d{4}$", message = "OTP must be a 4-digit number")
    private String otp;
}
