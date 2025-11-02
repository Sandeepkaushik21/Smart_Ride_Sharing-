package com.infosys.rsa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
public class RidePostRequest {
    @NotBlank(message = "Source is required")
    private String source;

    @NotBlank(message = "Destination is required")
    private String destination;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotNull(message = "Time is required")
    private LocalTime time;

    @NotNull(message = "Available seats is required")
    @Positive(message = "Available seats must be positive")
    private Integer availableSeats;

    // Vehicle photos (base64 encoded strings)
    @NotNull(message = "Vehicle photos are required")
    @Size(min = 4, max = 5, message = "Please upload 4-5 photos of your vehicle")
    private List<String> vehiclePhotos;

    // Vehicle condition details
    @NotNull(message = "AC information is required")
    private Boolean hasAC;

    @NotBlank(message = "Vehicle type is required")
    private String vehicleType; // Car, Bike, etc.

    private String vehicleModel;

    private String vehicleColor;

    private String otherFeatures; // Additional vehicle features/details
}

