package com.infosys.rsa.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RideInvoiceDTO {
    // Invoice Metadata
    private String invoiceNumber;
    private LocalDateTime invoiceDate;
    private String gstin;
    private String sacCode;
    private String companyName;
    private String companyAddress;
    private String companyEmail;
    private String companySupportPhone;

    // Booking & Status
    private Long bookingId;
    private String bookingStatus;
    private Boolean isOtpVerified;

    // Passenger Information
    private Long passengerId;
    private String passengerName;
    private String passengerEmail;
    private String passengerPhone;

    // Driver & Vehicle Information
    private Long driverId;
    private String driverName;
    private String driverPhone;
    private String vehicleType;
    private String vehicleModel;
    private String vehicleColor;
    private String licensePlate;

    // Trip Details
    private String sourceCity;
    private String destinationCity;
    private String pickupLocation;
    private String dropoffLocation;
    private String rideDate;
    private String rideTime;
    private Integer numberOfSeats;

    // Financial & Tax Breakdown
    private Double baseFare;
    private Double platformFee;
    private Double cgstRate; // 2.5%
    private Double cgstAmount;
    private Double sgstRate; // 2.5%
    private Double sgstAmount;
    private Double totalTax;
    private Double totalAmount;

    // Payment Information
    private String paymentStatus;
    private String paymentMethod;
    private String razorpayPaymentId;
    private String razorpayOrderId;
    private LocalDateTime paidAt;
}
