package com.infosys.rsa.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.infosys.rsa.dto.RidePostRequest;
import com.infosys.rsa.dto.RideRescheduleRequest;
import com.infosys.rsa.dto.RideSearchRequest;
import com.infosys.rsa.model.Booking;
import com.infosys.rsa.model.Ride;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.BookingRepository;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RideService {

    private static final Logger logger = LoggerFactory.getLogger(RideService.class);

    @Autowired
    private RideRepository rideRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FareCalculationService fareCalculationService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private EmailService emailService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ============================ POST RIDE ============================

    @Transactional
    public Ride postRide(Long driverId, RidePostRequest request) {

        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        if (driver.getIsApproved() == null || !driver.getIsApproved()) {
            throw new RuntimeException("Driver account is not approved yet");
        }

        if (driver.getIsOnHold()) {
            throw new RuntimeException("Driver account is on hold");
        }

        // -------- VEHICLE FROM USER --------
        if (driver.getVehicleModel() == null || driver.getLicensePlate() == null) {
            throw new RuntimeException("Driver has no registered vehicle");
        }

        // -------- DISTANCE + FARE --------
        double distance;
        double estimatedFare;
        try {
            distance = fareCalculationService.calculateDistance(
                    request.getSource(),
                    request.getDestination()
            );
            estimatedFare = fareCalculationService.calculateFare(distance);
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate route distance", e);
        }

        // -------- CREATE RIDE --------
        Ride ride = new Ride();
        ride.setDriver(driver);

        ride.setCitySource(request.getCitySource());
        ride.setCityDestination(request.getCityDestination());
        ride.setSource(request.getSource());
        ride.setDestination(request.getDestination());

        ride.setDate(request.getDate());
        ride.setTime(request.getTime());

        ride.setAvailableSeats(request.getAvailableSeats());
        ride.setTotalSeats(request.getAvailableSeats());

        Double baseFare = (request.getBaseFare() != null && request.getBaseFare() > 0)
                ? request.getBaseFare()
                : 50.0;

        ride.setBaseFare(baseFare);
        ride.setRatePerKm(5.0);
        ride.setTotalDistance(distance);
        ride.setEstimatedFare(estimatedFare);
        ride.setStatus(Ride.RideStatus.SCHEDULED);

        // -------- VEHICLE SNAPSHOT --------
        ride.setVehicleModel(driver.getVehicleModel());

        // -------- PICKUP LOCATIONS --------
        if (request.getPickupLocations() == null || request.getPickupLocations().size() != 4) {
            throw new RuntimeException("Please provide exactly 4 pickup locations");
        }
        try {
            ride.setPickupLocationsJson(
                    objectMapper.writeValueAsString(request.getPickupLocations())
            );
        } catch (Exception e) {
            throw new RuntimeException("Invalid pickup locations", e);
        }

        // -------- DROP LOCATIONS --------
        if (request.getDropLocations() == null || request.getDropLocations().size() != 4) {
            throw new RuntimeException("Please provide exactly 4 drop locations");
        }
        try {
            ride.setDropLocationsJson(
                    objectMapper.writeValueAsString(request.getDropLocations())
            );
        } catch (Exception e) {
            throw new RuntimeException("Invalid drop locations", e);
        }

        return rideRepository.save(ride);
    }

    // ============================ SEARCH ============================

    public List<Ride> searchRides(RideSearchRequest request) {

        String source = request.getSource() != null ? request.getSource() : "";
        String destination = request.getDestination() != null ? request.getDestination() : "";
        LocalDate date = request.getDate() != null ? request.getDate() : LocalDate.now();

        List<Ride> rides = rideRepository.searchRides(source, destination, date);

        if (request.getMinPrice() != null) {
            rides = rides.stream()
                    .filter(r -> r.getEstimatedFare() >= request.getMinPrice())
                    .collect(Collectors.toList());
        }

        if (request.getMaxPrice() != null) {
            rides = rides.stream()
                    .filter(r -> r.getEstimatedFare() <= request.getMaxPrice())
                    .collect(Collectors.toList());
        }

        if (request.getMinRating() != null) {
            rides = rides.stream()
                    .filter(r -> r.getDriver().getDriverRating() >= request.getMinRating())
                    .collect(Collectors.toList());
        }

        return rides;
    }

    // ============================ GET BY DRIVER ============================

    public List<Ride> getRidesByDriver(Long driverId) {
        return rideRepository.findByDriverId(driverId);
    }

    public Ride getRideById(Long rideId) {
        return rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));
    }

    // ============================ RESCHEDULE ============================

    @Transactional
    public Ride rescheduleRide(Long driverId, Long rideId, RideRescheduleRequest request) {

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driverId)) {
            throw new RuntimeException("You can only reschedule your own rides");
        }

        if (ride.getStatus() == Ride.RideStatus.CANCELLED ||
                ride.getStatus() == Ride.RideStatus.COMPLETED) {
            throw new RuntimeException("Ride cannot be rescheduled");
        }

        LocalDate oldDate = ride.getDate();
        LocalTime oldTime = ride.getTime();

        ride.setDate(request.getNewDate());
        ride.setTime(request.getNewTime());

        Ride updatedRide = rideRepository.save(ride);

        List<Booking> bookings = bookingRepository.findByRideId(rideId);

        for (Booking booking : bookings) {
            try {
                emailService.sendRideRescheduleNotification(
                        booking.getPassenger().getEmail(),
                        booking.getPassenger().getName(),
                        ride.getDriver().getName(),
                        ride.getSource(),
                        ride.getDestination(),
                        oldDate.toString(),
                        oldTime.toString(),
                        request.getNewDate().toString(),
                        request.getNewTime().toString(),
                        request.getReason()
                );
            } catch (Exception e) {
                logger.error("Email failed: {}", e.getMessage());
            }
        }

        return updatedRide;
    }
}
