package com.infosys.rsa.service;

import com.infosys.rsa.dto.RidePostRequest;
import com.infosys.rsa.dto.RideSearchRequest;
import com.infosys.rsa.model.Ride;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class RideService {
    @Autowired
    RideRepository rideRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    FareCalculationService fareCalculationService;

    @Autowired
    EmailService emailService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public Ride postRide(Long driverId, RidePostRequest request) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        if (!driver.getIsApproved()) {
            throw new RuntimeException("Driver account is not approved yet");
        }

        // Calculate distance and fare
        double distance = fareCalculationService.calculateDistance(request.getSource(), request.getDestination());
        double estimatedFare = fareCalculationService.calculateFare(distance);

        Ride ride = new Ride();
        ride.setDriver(driver);
        ride.setSource(request.getSource());
        ride.setDestination(request.getDestination());
        ride.setDate(request.getDate());
        ride.setTime(request.getTime());
        ride.setAvailableSeats(request.getAvailableSeats());
        ride.setTotalSeats(request.getAvailableSeats());
        ride.setBaseFare(50.0);
        ride.setRatePerKm(5.0);
        ride.setTotalDistance(distance);
        ride.setEstimatedFare(estimatedFare);
        ride.setStatus(Ride.RideStatus.SCHEDULED);

        // Store vehicle photos as JSON string
        if (request.getVehiclePhotos() != null && !request.getVehiclePhotos().isEmpty()) {
            try {
                String vehiclePhotosJson = objectMapper.writeValueAsString(request.getVehiclePhotos());
                ride.setVehiclePhotosJson(vehiclePhotosJson);
            } catch (Exception e) {
                throw new RuntimeException("Error processing vehicle photos: " + e.getMessage());
            }
        }

        // Store vehicle condition details
        ride.setHasAC(request.getHasAC());
        ride.setVehicleType(request.getVehicleType());
        ride.setVehicleModel(request.getVehicleModel());
        ride.setVehicleColor(request.getVehicleColor());
        ride.setOtherFeatures(request.getOtherFeatures());

        Ride savedRide = rideRepository.save(ride);

        // No email notification for ride posting - only send when ride is booked

        return savedRide;
    }

    public List<Ride> searchRides(RideSearchRequest request) {
        String source = request.getSource() != null ? request.getSource() : "";
        String destination = request.getDestination() != null ? request.getDestination() : "";
        LocalDate date = request.getDate() != null ? request.getDate() : LocalDate.now();

        List<Ride> rides = rideRepository.searchRides(source, destination, date);

        // Apply additional filters
        if (request.getMinPrice() != null) {
            rides = rides.stream()
                    .filter(ride -> ride.getEstimatedFare() >= request.getMinPrice())
                    .collect(Collectors.toList());
        }

        if (request.getMaxPrice() != null) {
            rides = rides.stream()
                    .filter(ride -> ride.getEstimatedFare() <= request.getMaxPrice())
                    .collect(Collectors.toList());
        }

        if (request.getMinRating() != null) {
            rides = rides.stream()
                    .filter(ride -> ride.getDriver().getDriverRating() >= request.getMinRating())
                    .collect(Collectors.toList());
        }

        return rides;
    }

    public List<Ride> getRidesByDriver(Long driverId) {
        return rideRepository.findByDriverId(driverId);
    }

    public Ride getRideById(Long rideId) {
        return rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));
    }

}

