package com.infosys.rsa.service;

import com.infosys.rsa.dto.RidePostRequest;
import com.infosys.rsa.dto.RideRescheduleRequest;
import com.infosys.rsa.dto.RideSearchRequest;
import com.infosys.rsa.model.Booking;
import com.infosys.rsa.model.Ride;
import com.infosys.rsa.model.User;
import com.infosys.rsa.model.Vehicle;
import com.infosys.rsa.model.Vehicle.VehicleStatus;
import com.infosys.rsa.repository.BookingRepository;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.UserRepository;
import com.infosys.rsa.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class RideService {
    @Autowired
    RideRepository rideRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    VehicleRepository vehicleRepository;

    @Autowired
    FareCalculationService fareCalculationService;

    @Autowired
    EmailService emailService;

    @Autowired
    BookingRepository bookingRepository;

    @Autowired
    UserService userService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public Ride postRide(Long driverId, RidePostRequest request) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        if (driver.getIsApproved() == null || !driver.getIsApproved()) {
            throw new RuntimeException("Driver account is not approved yet");
        }
        if (driver.getIsOnHold()) {
            throw new RuntimeException("Driver account is on hold. You cannot post new rides.");
        }

        Vehicle vehicle;
        
        // Handle vehicle selection: use vehicleId if provided, otherwise use master details
        if (request.getVehicleId() != null) {
            // Use provided vehicleId
            vehicle = vehicleRepository.findById(request.getVehicleId())
                    .orElseThrow(() -> new RuntimeException("Selected vehicle not found"));

            if (!vehicle.getDriver().getId().equals(driverId)) {
                throw new RuntimeException("You can only use your own vehicles for posting rides");
            }

            if (vehicle.getStatus() != VehicleStatus.APPROVED) {
                throw new RuntimeException("Selected vehicle is not approved yet");
            }
        } else if (Boolean.TRUE.equals(request.getUseMasterDetails())) {
            // Use master vehicle details - find existing approved vehicle or create one
            try {
                // First, try to find an existing approved vehicle for this driver
                List<Vehicle> approvedVehicles = vehicleRepository.findByDriverIdAndStatus(driverId, VehicleStatus.APPROVED);
                if (!approvedVehicles.isEmpty()) {
                    // Use the first approved vehicle
                    vehicle = approvedVehicles.get(0);
                } else {
                    // No approved vehicle found, try to create one from master details
                    java.util.Map<String, Object> masterDetails = userService.getMasterVehicleDetails(driverId);
                    if (masterDetails == null || masterDetails.isEmpty()) {
                        throw new RuntimeException("Please add your vehicle details first in the 'Vehicle Details' section");
                    }
                    
                    // Create a new vehicle from master details
                    vehicle = new Vehicle();
                    vehicle.setDriver(driver);
                    vehicle.setVehicleType((String) masterDetails.get("vehicleType"));
                    vehicle.setVehicleModel((String) masterDetails.get("vehicleModel"));
                    vehicle.setVehicleColor((String) masterDetails.get("vehicleColor"));
                    vehicle.setHasAC((Boolean) masterDetails.get("hasAC"));
                    
                    // Handle vehicle photos
                    Object vehiclePhotosObj = masterDetails.get("vehiclePhotos");
                    if (vehiclePhotosObj != null) {
                        try {
                            if (vehiclePhotosObj instanceof List) {
                                vehicle.setPhotosJson(objectMapper.writeValueAsString(vehiclePhotosObj));
                            } else if (vehiclePhotosObj instanceof String) {
                                vehicle.setPhotosJson((String) vehiclePhotosObj);
                            }
                        } catch (JsonProcessingException e) {
                            throw new RuntimeException("Error serializing vehicle photos: " + e.getMessage(), e);
                        }
                    }
                    
                    // Use license plate and capacity from User if available
                    if (driver.getLicensePlate() != null) {
                        vehicle.setLicensePlate(driver.getLicensePlate());
                    }
                    if (driver.getVehicleCapacity() != null) {
                        vehicle.setCapacity(driver.getVehicleCapacity());
                    }
                    
                    // Auto-approve vehicle if driver is approved (for seamless experience)
                    // Alternatively, set to PENDING for admin review - choose based on your business logic
                    vehicle.setStatus(VehicleStatus.APPROVED); // Auto-approve for approved drivers
                    vehicle.setIsActive(true);
                    
                    vehicle = vehicleRepository.save(vehicle);
                }
            } catch (Exception e) {
                if (e instanceof RuntimeException) {
                    throw e;
                }
                throw new RuntimeException("Error processing vehicle details: " + e.getMessage(), e);
            }
        } else {
            throw new RuntimeException("Validation failed: vehicleId: Vehicle is required");
        }

        // Calculate distance and fare
        double distance = fareCalculationService.calculateDistance(request.getSource(), request.getDestination());
        double estimatedFare = fareCalculationService.calculateFare(distance);

        Ride ride = new Ride();
        ride.setDriver(driver);
        // ride.setVehicle(vehicle); // removed: Ride model doesn't have a vehicle relation; we store a snapshot instead
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

        // Copy vehicle details onto ride snapshot so passengers always see the correct info
        ride.setHasAC(vehicle.getHasAC());
        ride.setVehicleType(vehicle.getVehicleType());
        ride.setVehicleModel(vehicle.getVehicleModel());
        ride.setVehicleColor(vehicle.getVehicleColor());
        // Photos
        ride.setVehiclePhotosJson(vehicle.getPhotosJson());
        // Optional extra features from legacy request (still allowed)
        ride.setOtherFeatures(request.getOtherFeatures());

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

        // Save and return the ride (no immediate email notification required)
        return rideRepository.save(ride);
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
