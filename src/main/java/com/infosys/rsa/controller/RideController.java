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
    @Autowired
    RideService rideService;

    @Autowired
    BookingService bookingService;

    @PostMapping("/post")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> postRide(@Valid @RequestBody RidePostRequest request,
                                      Authentication authentication) {
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Ride ride = rideService.postRide(userPrincipal.getId(), request);
            return ResponseEntity.ok(ride);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchRides(@ModelAttribute RideSearchRequest request) {
        List<Ride> rides = rideService.searchRides(request);
        // Map to DTO to ensure driver info is included and shape is stable
        List<RideResponse> response = rides.stream().map(RideResponse::new).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-rides")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> getMyRides(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        List<Ride> rides = rideService.getRidesByDriver(userPrincipal.getId());
        return ResponseEntity.ok(rides);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRideById(@PathVariable Long id) {
        try {
            Ride ride = rideService.getRideById(id);
            return ResponseEntity.ok(ride);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> cancelRide(@PathVariable Long id, Authentication authentication) {
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Ride ride = bookingService.cancelRideForDriver(userPrincipal.getId(), id);

            // Return updated lists so frontend can update counts without extra round-trip
            List<Ride> myRides = rideService.getRidesByDriver(userPrincipal.getId());
            List<Booking> driverBookings = bookingService.getBookingsByDriver(userPrincipal.getId());

            CancelRideResponse resp = new CancelRideResponse(ride, myRides, driverBookings);
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
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
