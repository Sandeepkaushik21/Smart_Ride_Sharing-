package com.infosys.rsa.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateBookingLocationsRequest {
    @NotBlank(message = "First pickup location is required")
    private String pickupLocation1;
    
    private String pickupLocation2; // Optional second pickup location
    
    @NotBlank(message = "Drop location is required")
    private String dropLocation;
}

