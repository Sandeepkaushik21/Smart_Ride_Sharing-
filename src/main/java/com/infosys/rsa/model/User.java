package com.infosys.rsa.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true)
    private String phone;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Set<Role> roles = new HashSet<>();

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "is_approved")
    private Boolean isApproved = false; // For driver approval by admin

    @Column(name = "is_first_login")
    private Boolean isFirstLogin = true; // For temp password login

    @Column(name = "temp_password")
    private String tempPassword;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Driver specific fields
    @Column(name = "vehicle_model")
    private String vehicleModel;

    @Column(name = "license_plate")
    private String licensePlate;

    @Column(name = "vehicle_capacity")
    private Integer vehicleCapacity;

    @Column(name = "driver_rating")
    private Double driverRating = 0.0;

    @Column(name = "total_rides")
    private Integer totalRides = 0;

    // Wallet balance for drivers (earnings from rides)
    @Column(name = "wallet_balance")
    private Double walletBalance = 0.0;

    // Master vehicle details (stored as JSON for reuse in ride posting)
    @Column(name = "master_vehicle_details", columnDefinition = "LONGTEXT")
    private String masterVehicleDetailsJson; // JSON string containing: vehiclePhotos, hasAC, vehicleType, vehicleModel, vehicleColor, otherFeatures

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

