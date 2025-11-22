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
import java.util.Map;
import java.util.stream.Collectors;
import com.fasterxml.jackson.core.type.TypeReference;
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

        // Handle vehicle details: use master details if requested, otherwise use provided details
        if (request.getUseMasterDetails() != null && request.getUseMasterDetails() && driver.getMasterVehicleDetailsJson() != null) {
            // Load master vehicle details from driver's profile
            try {
                Map<String, Object> masterDetails = objectMapper.readValue(
                    driver.getMasterVehicleDetailsJson(), 
                    new TypeReference<Map<String, Object>>() {}
                );
                
                // Set vehicle photos from master details
                if (masterDetails.containsKey("vehiclePhotos")) {
                    Object photos = masterDetails.get("vehiclePhotos");
                    if (photos instanceof List) {
                        String vehiclePhotosJson = objectMapper.writeValueAsString(photos);
                        ride.setVehiclePhotosJson(vehiclePhotosJson);
                    }
                }
                
                // Set vehicle condition details from master details
                if (masterDetails.containsKey("hasAC")) {
                    ride.setHasAC((Boolean) masterDetails.get("hasAC"));
                }
                if (masterDetails.containsKey("vehicleType")) {
                    ride.setVehicleType((String) masterDetails.get("vehicleType"));
                }
                if (masterDetails.containsKey("vehicleModel")) {
                    ride.setVehicleModel((String) masterDetails.get("vehicleModel"));
                }
                if (masterDetails.containsKey("vehicleColor")) {
                    ride.setVehicleColor((String) masterDetails.get("vehicleColor"));
                }
                if (masterDetails.containsKey("otherFeatures")) {
                    ride.setOtherFeatures((String) masterDetails.get("otherFeatures"));
                }
            } catch (Exception e) {
                throw new RuntimeException("Error loading master vehicle details: " + e.getMessage());
            }
        } else {
            // Use provided vehicle details
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
            
            // Auto-save master vehicle details if not already saved
            if (driver.getMasterVehicleDetailsJson() == null || driver.getMasterVehicleDetailsJson().trim().isEmpty()) {
                try {
                    Map<String, Object> masterDetails = new java.util.HashMap<>();
                    if (request.getVehiclePhotos() != null && !request.getVehiclePhotos().isEmpty()) {
                        masterDetails.put("vehiclePhotos", request.getVehiclePhotos());
                    }
                    masterDetails.put("hasAC", request.getHasAC());
                    masterDetails.put("vehicleType", request.getVehicleType());
                    masterDetails.put("vehicleModel", request.getVehicleModel());
                    masterDetails.put("vehicleColor", request.getVehicleColor());
                    masterDetails.put("otherFeatures", request.getOtherFeatures());
                    
                    String masterDetailsJson = objectMapper.writeValueAsString(masterDetails);
                    driver.setMasterVehicleDetailsJson(masterDetailsJson);
                    userRepository.save(driver);
                } catch (Exception e) {
                    // Log error but don't fail the ride creation
                    System.err.println("Error saving master vehicle details: " + e.getMessage());
                }
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
        double totalRefundAmount = 0.0;
        int refundedBookingsCount = 0;
        
        for (Booking booking : allBookings) {
            if (booking.getStatus() == Booking.BookingStatus.CONFIRMED ||
                booking.getStatus() == Booking.BookingStatus.ACCEPTED) {
                
                // If booking is CONFIRMED (payment made), mark as RESCHEDULED and calculate refund
                if (booking.getStatus() == Booking.BookingStatus.CONFIRMED) {
                    booking.setStatus(Booking.BookingStatus.RESCHEDULED);
                    bookingRepository.save(booking);
                    if (booking.getFareAmount() != null) {
                        totalRefundAmount += booking.getFareAmount();
                        refundedBookingsCount++;
                    }
                } else {
                    // If booking is ACCEPTED (no payment yet), just mark as RESCHEDULED
                    booking.setStatus(Booking.BookingStatus.RESCHEDULED);
                    bookingRepository.save(booking);
                }
                
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
        
        // Send refund notification email to driver if there were confirmed bookings
        if (refundedBookingsCount > 0) {
            try {
                emailService.sendRescheduleRefundNotification(
                        ride.getDriver().getEmail(),
                        driverName,
                        totalRefundAmount,
                        refundedBookingsCount,
                        oldDateStr,
                        oldTimeStr,
                        newDateStr,
                        newTimeStr
                );
            } catch (Exception e) {
                System.err.println("Failed to send refund notification to driver: " + e.getMessage());
            }
        }

        return updatedRide;
    }

}

