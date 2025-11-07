package com.infosys.rsa.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.infosys.rsa.dto.RidePostRequest;
import com.infosys.rsa.dto.RideSearchRequest;
import com.infosys.rsa.model.Ride;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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
    private EmailService emailService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Post a new ride by a verified driver
     */
    @Transactional
    public Ride postRide(Long driverId, RidePostRequest request) {
        logger.info("Driver {} attempting to post a new ride from '{}' to '{}'", driverId, request.getSource(), request.getDestination());

        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> {
                    logger.error("Driver not found with ID: {}", driverId);
                    return new RuntimeException("Driver not found");
                });

        if (driver.getIsApproved() == null || !driver.getIsApproved()) {
            logger.warn("Driver {} attempted to post a ride but account is not approved.", driverId);
            throw new RuntimeException("Driver account is not approved yet");
        }

        // Calculate distance and fare
        double distance = fareCalculationService.calculateDistance(request.getSource(), request.getDestination());
        double estimatedFare = fareCalculationService.calculateFare(distance);
        logger.debug("Calculated distance: {} km, Estimated fare: {}", distance, estimatedFare);

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
        ride.setBaseFare(50.0);
        ride.setRatePerKm(5.0);
        ride.setTotalDistance(distance);
        ride.setEstimatedFare(estimatedFare);
        ride.setStatus(Ride.RideStatus.SCHEDULED);

        // Handle vehicle photos (convert to JSON)
        if (request.getVehiclePhotos() != null && !request.getVehiclePhotos().isEmpty()) {
            try {
                String vehiclePhotosJson = objectMapper.writeValueAsString(request.getVehiclePhotos());
                ride.setVehiclePhotosJson(vehiclePhotosJson);
                logger.debug("Stored {} vehicle photos for ride.", request.getVehiclePhotos().size());
            } catch (Exception e) {
                logger.error("Error processing vehicle photos for driver {}: {}", driverId, e.getMessage());
                throw new RuntimeException("Error processing vehicle photos: " + e.getMessage());
            }
        }

        // Store vehicle details
        ride.setHasAC(request.getHasAC());
        ride.setVehicleType(request.getVehicleType());
        ride.setVehicleModel(request.getVehicleModel());
        ride.setVehicleColor(request.getVehicleColor());
        ride.setOtherFeatures(request.getOtherFeatures());

        Ride savedRide = rideRepository.save(ride);
        logger.info("Ride posted successfully. Ride ID: {}, Driver ID: {}", savedRide.getId(), driverId);

        return savedRide;
    }

    /**
     * Search for rides based on filters
     */
    public List<Ride> searchRides(RideSearchRequest request) {
        String source = request.getSource() != null ? request.getSource() : "";
        String destination = request.getDestination() != null ? request.getDestination() : "";
        LocalDate date = request.getDate() != null ? request.getDate() : LocalDate.now();

        logger.info("Searching rides: Source='{}', Destination='{}', Date={}", source, destination, date);
        List<Ride> rides = rideRepository.searchRides(source, destination, date);
        logger.debug("Found {} rides matching source/destination/date criteria.", rides.size());

        // Filter by price range
        if (request.getMinPrice() != null) {
            rides = rides.stream()
                    .filter(ride -> ride.getEstimatedFare() >= request.getMinPrice())
                    .collect(Collectors.toList());
            logger.debug("Filtered rides by minPrice {}: Remaining count = {}", request.getMinPrice(), rides.size());
        }

        if (request.getMaxPrice() != null) {
            rides = rides.stream()
                    .filter(ride -> ride.getEstimatedFare() <= request.getMaxPrice())
                    .collect(Collectors.toList());
            logger.debug("Filtered rides by maxPrice {}: Remaining count = {}", request.getMaxPrice(), rides.size());
        }

        // Filter by driver rating
        if (request.getMinRating() != null) {
            rides = rides.stream()
                    .filter(ride -> ride.getDriver().getDriverRating() >= request.getMinRating())
                    .collect(Collectors.toList());
            logger.debug("Filtered rides by minRating {}: Remaining count = {}", request.getMinRating(), rides.size());
        }

        logger.info("Final result count after all filters: {}", rides.size());
        return rides;
    }

    /**
     * Get all rides posted by a specific driver
     */
    public List<Ride> getRidesByDriver(Long driverId) {
        logger.info("Fetching rides for driver ID: {}", driverId);
        List<Ride> rides = rideRepository.findByDriverId(driverId);
        logger.debug("Driver {} has {} rides posted.", driverId, rides.size());
        return rides;
    }

    /**
     * Get ride details by ride ID
     */
    public Ride getRideById(Long rideId) {
        logger.info("Fetching ride details for Ride ID: {}", rideId);
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> {
                    logger.error("Ride not found with ID: {}", rideId);
                    return new RuntimeException("Ride not found");
                });
        logger.debug("Ride details fetched successfully for ID: {}", rideId);
        return ride;
    }
}
