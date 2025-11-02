package com.infosys.rsa.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rides")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Ride {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "roles", "tempPassword"})
    private User driver;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private String destination;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private LocalTime time;

    @Column(name = "available_seats", nullable = false)
    private Integer availableSeats;

    @Column(name = "total_seats", nullable = false)
    private Integer totalSeats;

    @Column(name = "base_fare")
    private Double baseFare = 50.0;

    @Column(name = "rate_per_km")
    private Double ratePerKm = 5.0;

    @Column(name = "total_distance")
    private Double totalDistance; // in km

    @Column(name = "estimated_fare")
    private Double estimatedFare;

    @Enumerated(EnumType.STRING)
    @Column(name = "ride_status")
    private RideStatus status = RideStatus.SCHEDULED;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Vehicle photos (stored as JSON array of base64 strings or URLs)
    @Column(name = "vehicle_photos", columnDefinition = "LONGTEXT")
    private String vehiclePhotosJson; // JSON array string

    // Vehicle condition details
    @Column(name = "has_ac")
    private Boolean hasAC;

    @Column(name = "vehicle_type")
    private String vehicleType; // Car, Bike, etc.

    @Column(name = "vehicle_model")
    private String vehicleModel;

    @Column(name = "vehicle_color")
    private String vehicleColor;

    @Column(name = "other_features", columnDefinition = "TEXT")
    private String otherFeatures; // Additional vehicle features/details

    public enum RideStatus {
        SCHEDULED,
        ONGOING,
        COMPLETED,
        CANCELLED
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Helper method to get vehicle photos as List
    public List<String> getVehiclePhotosList() {
        if (vehiclePhotosJson == null || vehiclePhotosJson.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(vehiclePhotosJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}

