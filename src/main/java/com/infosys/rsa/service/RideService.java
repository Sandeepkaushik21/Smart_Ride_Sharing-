package com.infosys.rsa.service;

import com.infosys.rsa.dto.RidePostRequest;
import com.infosys.rsa.dto.RideRescheduleRequest;
import com.infosys.rsa.dto.RideSearchRequest;
import com.infosys.rsa.model.Booking;
import com.infosys.rsa.model.Ride;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.BookingRepository;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
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

    @Autowired
    BookingRepository bookingRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public Ride postRide(Long driverId, RidePostRequest request) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        if (driver.getIsApproved() == null || !driver.getIsApproved()) {
            throw new RuntimeException("Driver account is not approved yet");
        }

        // Calculate distance and fare
        double distance = fareCalculationService.calculateDistance(request.getSource(), request.getDestination());
        double estimatedFare = fareCalculationService.calculateFare(distance);

        Ride ride = new Ride();
        ride.setDriver(driver);
        // Store city-level route (for display and search)
        ride.setCitySource(request.getCitySource());
        ride.setCityDestination(request.getCityDestination());
        // Store specific locations (for actual pickup/dropoff)
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

        // Store pickup locations as JSON string
        if (request.getPickupLocations() != null && !request.getPickupLocations().isEmpty()) {
            try {
                String pickupLocationsJson = objectMapper.writeValueAsString(request.getPickupLocations());
                ride.setPickupLocationsJson(pickupLocationsJson);
            } catch (Exception e) {
                throw new RuntimeException("Error processing pickup locations: " + e.getMessage());
            }
        }

        // Store drop locations as JSON string
        if (request.getDropLocations() != null && !request.getDropLocations().isEmpty()) {
            try {
                String dropLocationsJson = objectMapper.writeValueAsString(request.getDropLocations());
                ride.setDropLocationsJson(dropLocationsJson);
            } catch (Exception e) {
                throw new RuntimeException("Error processing drop locations: " + e.getMessage());
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

    @Transactional
    public Ride rescheduleRide(Long driverId, Long rideId, RideRescheduleRequest request) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driverId)) {
            throw new RuntimeException("You can only reschedule your own rides.");
        }

        if (ride.getStatus() == Ride.RideStatus.CANCELLED) {
            throw new RuntimeException("Cannot reschedule a cancelled ride.");
        }

        if (ride.getStatus() == Ride.RideStatus.COMPLETED) {
            throw new RuntimeException("Cannot reschedule a completed ride.");
        }

        // Store old values for notification
        LocalDate oldDate = ride.getDate();
        LocalTime oldTime = ride.getTime();
        String oldDateStr = oldDate != null ? oldDate.toString() : "N/A";
        String oldTimeStr = oldTime != null ? oldTime.toString() : "N/A";

        // Update ride with new date and time
        ride.setDate(request.getNewDate());
        ride.setTime(request.getNewTime());
        Ride updatedRide = rideRepository.save(ride);

        // Send reschedule notifications to all passengers with confirmed/accepted bookings
        String newDateStr = request.getNewDate().toString();
        String newTimeStr = request.getNewTime().toString();
        String driverName = ride.getDriver().getName() != null ? ride.getDriver().getName() : ride.getDriver().getEmail();

        List<Booking> allBookings = bookingRepository.findByRideId(rideId);
        
        for (Booking booking : allBookings) {
            if (booking.getStatus() == Booking.BookingStatus.CONFIRMED ||
                booking.getStatus() == Booking.BookingStatus.ACCEPTED) {
                
                try {
                    User passenger = booking.getPassenger();
                    String passengerName = passenger.getName() != null ? passenger.getName() : passenger.getEmail();
                    
                    emailService.sendRideRescheduleNotification(
                            passenger.getEmail(),
                            passengerName,
                            driverName,
                            booking.getPickupLocation() != null ? booking.getPickupLocation() : ride.getSource(),
                            booking.getDropoffLocation() != null ? booking.getDropoffLocation() : ride.getDestination(),
                            oldDateStr,
                            oldTimeStr,
                            newDateStr,
                            newTimeStr,
                            request.getReason()
                    );
                } catch (Exception e) {
                    // Log error but don't fail the transaction
                    System.err.println("Failed to send reschedule notification: " + e.getMessage());
                }
            }
        }

        return updatedRide;
    }

}

