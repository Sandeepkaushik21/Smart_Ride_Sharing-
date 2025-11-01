package com.infosys.rsa.service;

import org.springframework.stereotype.Service;

@Service
public class FareCalculationService {
    private static final double BASE_FARE = 50.0;
    private static final double RATE_PER_KM = 5.0;

    /**
     * Calculate fare based on distance
     * For now, using a simple calculation
     * In production, this would use Google Maps Distance Matrix API
     */
    public double calculateFare(double distanceInKm) {
        if (distanceInKm <= 0) {
            return BASE_FARE;
        }
        return BASE_FARE + (RATE_PER_KM * distanceInKm);
    }

    /**
     * Calculate distance between two cities (dummy implementation)
     * In production, use Google Maps Distance Matrix API
     */
    public double calculateDistance(String source, String destination) {
        // Dummy distance calculation - returns random distance between 10-500 km
        // In production, integrate with Google Maps API
        double baseDistance = Math.abs(source.hashCode() % 500);
        double destDistance = Math.abs(destination.hashCode() % 500);
        double distance = Math.abs(baseDistance - destDistance);
        return Math.max(distance, 10); // Minimum 10 km
    }

    /**
     * Split fare proportionally based on distance covered by passenger
     */
    public double calculateProportionalFare(double totalFare, double totalDistance, double passengerDistance) {
        if (totalDistance <= 0 || passengerDistance <= 0) {
            return totalFare;
        }
        double proportion = passengerDistance / totalDistance;
        return totalFare * proportion;
    }
}

