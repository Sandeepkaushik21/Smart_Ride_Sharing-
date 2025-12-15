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
    // City-level source and destination (for display and search)
    @NotBlank(message = "Source city is required")
    private String citySource;

    @NotBlank(message = "Destination city is required")
    private String cityDestination;

    // Specific pickup and dropoff locations (for actual operations)
    @NotBlank(message = "Source location is required")
    private String source;

    @NotBlank(message = "Destination location is required")
    private String destination;

    // Driver selected pickup locations (4 areas in source city)
    @NotNull(message = "Pickup locations are required")
    @Size(min = 4, max = 4, message = "Please select exactly 4 pickup locations")
    private List<String> pickupLocations;

    // Driver selected drop locations (4 areas in destination city)
    @NotNull(message = "Drop locations are required")
    @Size(min = 4, max = 4, message = "Please select exactly 4 drop locations")
    private List<String> dropLocations;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotNull(message = "Time is required")
    private LocalTime time;

    @NotNull(message = "Available seats is required")
    @Positive(message = "Available seats must be positive")
    private Integer availableSeats;

    // Vehicle chosen by driver for this ride
    // Can be null if useMasterDetails is true - validation handled in service layer
    private Long vehicleId;

    // Legacy fields (no longer used now that rides are tied to a Vehicle entity)
    // Kept for backward compatibility with older clients, but ignored in service layer.
    private Boolean useMasterDetails = false;

    private List<String> vehiclePhotos;

    private Boolean hasAC;

    private String vehicleType; // Car, Bike, etc.

    private String vehicleModel;

    private String vehicleColor;

    private String otherFeatures; // Additional vehicle features/details
}

