package com.infosys.rsa.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "vehicles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @Column(name = "vehicle_type")
    private String vehicleType; // Car, Bike, etc.

    @Column(name = "vehicle_model")
    private String vehicleModel;

    @Column(name = "vehicle_color")
    private String vehicleColor;

    @Column(name = "license_plate")
    private String licensePlate;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "has_ac")
    private Boolean hasAC;

    @Column(name = "photos_json", columnDefinition = "LONGTEXT")
    private String photosJson; // JSON array of base64 strings or URLs

    // Compliance documents
    @Column(name = "license_number")
    private String licenseNumber;

    @Column(name = "license_valid_till")
    private LocalDate licenseValidTill;

    @Column(name = "rc_number")
    private String rcNumber;

    @Column(name = "rc_valid_till")
    private LocalDate rcValidTill;

    @Column(name = "pollution_number")
    private String pollutionNumber;

    @Column(name = "pollution_valid_till")
    private LocalDate pollutionValidTill;

    public enum VehicleStatus {
        PENDING,
        APPROVED,
        REJECTED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private VehicleStatus status = VehicleStatus.PENDING;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}





