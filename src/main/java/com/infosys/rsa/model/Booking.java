package com.infosys.rsa.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Ride ride;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passenger_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "roles", "tempPassword"})
    private User passenger;

    @Column(name = "pickup_location")
    private String pickupLocation;

    @Column(name = "pickup_location2")
    private String pickupLocation2; // Second pickup location (optional, for traveling passengers)

    @Column(name = "dropoff_location")
    private String dropoffLocation;

    @Column(name = "distance_covered")
    private Double distanceCovered; // in km

    @Column(name = "fare_amount")
    private Double fareAmount;

    @Column(name = "number_of_seats")
    private Integer numberOfSeats = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_status")
    private BookingStatus status = BookingStatus.PENDING;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum BookingStatus {
        PENDING,        // Waiting for driver approval
        ACCEPTED,       // Driver accepted, waiting for payment
        CONFIRMED,      // Payment completed
        CANCELLED,
        COMPLETED
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
}

