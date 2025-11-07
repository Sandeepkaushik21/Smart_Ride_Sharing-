package com.infosys.rsa.controller;

import com.infosys.rsa.dto.BookingRequest;
import com.infosys.rsa.model.Booking;
import com.infosys.rsa.model.Ride;
import com.infosys.rsa.security.UserDetailsServiceImpl.UserPrincipal;
import com.infosys.rsa.service.BookingService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private static final Logger logger = LoggerFactory.getLogger(BookingController.class);

    @Autowired
    BookingService bookingService;

    @PostMapping("/book")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> createBooking(@Valid @RequestBody BookingRequest request,
                                           Authentication authentication) {
        logger.info("Entering createBooking() for rideId: {}", request.getRideId());
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Passenger ID: {} requested booking", userPrincipal.getId());
            Booking booking = bookingService.createBooking(userPrincipal.getId(), request);
            logger.info("Booking created successfully with ID: {}", booking.getId());
            return ResponseEntity.ok(booking);
        } catch (RuntimeException e) {
            logger.error("Error creating booking for rideId {}: {}", request.getRideId(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/my-bookings")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> getMyBookings(Authentication authentication) {
        logger.info("Entering getMyBookings()");
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        logger.debug("Fetching bookings for passenger ID: {}", userPrincipal.getId());
        List<Booking> bookings = bookingService.getBookingsByPassenger(userPrincipal.getId());
        logger.info("Found {} bookings for passenger ID: {}", bookings.size(), userPrincipal.getId());
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/ride/{rideId}")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
    public ResponseEntity<?> getBookingsByRide(@PathVariable Long rideId) {
        logger.info("Entering getBookingsByRide() for rideId: {}", rideId);
        List<Booking> bookings = bookingService.getBookingsByRide(rideId);
        logger.info("Found {} bookings for rideId: {}", bookings.size(), rideId);
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/driver-bookings")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> getDriverBookings(Authentication authentication) {
        logger.info("Entering getDriverBookings()");
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        logger.debug("Fetching bookings for driver ID: {}", userPrincipal.getId());
        List<Booking> bookings = bookingService.getBookingsByDriver(userPrincipal.getId());
        logger.info("Found {} bookings for driver ID: {}", bookings.size(), userPrincipal.getId());
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PASSENGER', 'DRIVER', 'ADMIN')")
    public ResponseEntity<?> getBookingById(@PathVariable Long id) {
        logger.info("Entering getBookingById() for bookingId: {}", id);
        try {
            Booking booking = bookingService.getBookingById(id);
            logger.info("Booking found for ID: {}", id);
            return ResponseEntity.ok(booking);
        } catch (RuntimeException e) {
            logger.error("Error fetching booking by ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id, Authentication authentication) {
        logger.info("Entering cancelBooking() for bookingId: {}", id);
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Passenger ID: {} attempting to cancel booking", userPrincipal.getId());
            Booking booking = bookingService.cancelBooking(userPrincipal.getId(), id);
            logger.info("Booking with ID: {} cancelled successfully", id);

            List<Booking> myBookings = bookingService.getBookingsByPassenger(userPrincipal.getId());
            Ride updatedRide = booking.getRide();

            CancelBookingResponse resp = new CancelBookingResponse(booking, myBookings, updatedRide);
            logger.debug("Returning CancelBookingResponse for bookingId: {}", id);
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            logger.error("Error cancelling booking ID {}: {}", id, e.getMessage(), e);
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

    private static class CancelBookingResponse {
        private Booking cancelledBooking;
        private List<Booking> myBookings;
        private Ride updatedRide;

        public CancelBookingResponse(Booking cancelledBooking, List<Booking> myBookings, Ride updatedRide) {
            this.cancelledBooking = cancelledBooking;
            this.myBookings = myBookings;
            this.updatedRide = updatedRide;
        }

        public Booking getCancelledBooking() { return cancelledBooking; }
        public List<Booking> getMyBookings() { return myBookings; }
        public Ride getUpdatedRide() { return updatedRide; }
    }
}
