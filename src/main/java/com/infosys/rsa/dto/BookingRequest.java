package com.infosys.rsa.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BookingRequest {
    @NotNull(message = "Ride ID is required")
    private Long rideId;

    private String pickupLocation;
    private String dropoffLocation;
    
    @Min(value = 1, message = "Number of seats must be at least 1")
    private Integer numberOfSeats = 1;

    // Optional payment information (for tracking)
    private String paymentId;
    private String transactionId;
}

