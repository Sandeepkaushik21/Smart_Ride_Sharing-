package com.infosys.rsa.controller;

import com.infosys.rsa.dto.RidePostRequest;
import com.infosys.rsa.dto.RideSearchRequest;
import com.infosys.rsa.dto.RideResponse;
import com.infosys.rsa.model.Booking;
import com.infosys.rsa.model.Ride;
import com.infosys.rsa.security.UserDetailsServiceImpl.UserPrincipal;
import com.infosys.rsa.service.BookingService;
import com.infosys.rsa.service.RideService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/rides")
public class RideController {

    private static final Logger logger = LoggerFactory.getLogger(RideController.class);

    @Autowired
    RideService rideService;

    @Autowired
    BookingService bookingService;

    @PostMapping("/post")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> postRide(@Valid @RequestBody RidePostRequest request,
                                      Authentication authentication) {
        logger.info("Entering postRide() with driver authentication");
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Driver ID: {} is posting a new ride from {} to {}", userPrincipal.getId(), request.getSource(), request.getDestination());
            Ride ride = rideService.postRide(userPrincipal.getId(), request);
            logger.info("Ride posted successfully with Ride ID: {}", ride.getId());
            return ResponseEntity.ok(ride);
        } catch (RuntimeException e) {
            logger.error("Error posting ride: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchRides(@ModelAttribute RideSearchRequest request) {
        logger.info("Entering searchRides() with request: source={}, destination={}, date={}", request.getSource(), request.getDestination(), request.getDate());
        try {
            List<Ride> rides = rideService.searchRides(request);
            List<RideResponse> response = rides.stream().map(RideResponse::new).collect(Collectors.toList());
            logger.info("Search returned {} rides", response.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error searching rides: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse("Failed to search rides: " + e.getMessage()));
        }
    }

    @GetMapping("/my-rides")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> getMyRides(Authentication authentication) {
        logger.info("Entering getMyRides()");
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        logger.debug("Fetching rides for driver ID: {}", userPrincipal.getId());
        List<Ride> rides = rideService.getRidesByDriver(userPrincipal.getId());
        logger.info("Fetched {} rides for driver ID: {}", rides.size(), userPrincipal.getId());
        return ResponseEntity.ok(rides);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRideById(@PathVariable Long id) {
        logger.info("Entering getRideById() with Ride ID: {}", id);
        try {
            Ride ride = rideService.getRideById(id);
            logger.info("Fetched ride details successfully for Ride ID: {}", id);
            return ResponseEntity.ok(ride);
        } catch (RuntimeException e) {
            logger.error("Error fetching ride by ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> cancelRide(@PathVariable Long id, Authentication authentication) {
        logger.info("Entering cancelRide() with Ride ID: {}", id);
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Driver ID: {} attempting to cancel ride ID: {}", userPrincipal.getId(), id);

            Ride ride = bookingService.cancelRideForDriver(userPrincipal.getId(), id);

            List<Ride> myRides = rideService.getRidesByDriver(userPrincipal.getId());
            List<Booking> driverBookings = bookingService.getBookingsByDriver(userPrincipal.getId());

            logger.info("Ride ID: {} cancelled successfully by driver ID: {}", id, userPrincipal.getId());

            CancelRideResponse resp = new CancelRideResponse(ride, myRides, driverBookings);
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            logger.error("Error cancelling ride ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    private static class ErrorResponse {
        private String message;
        public ErrorResponse(String message) {
            this.message = message;
        }
        public String getMessage() {
            return message;
        }
    }

    // Response DTO for cancel ride
    private static class CancelRideResponse {
        private Ride ride;
        private List<Ride> myRides;
        private List<Booking> driverBookings;

        public CancelRideResponse(Ride ride, List<Ride> myRides, List<Booking> driverBookings) {
            this.ride = ride;
            this.myRides = myRides;
            this.driverBookings = driverBookings;
        }

        public Ride getRide() { return ride; }
        public List<Ride> getMyRides() { return myRides; }
        public List<Booking> getDriverBookings() { return driverBookings; }
    }
}
