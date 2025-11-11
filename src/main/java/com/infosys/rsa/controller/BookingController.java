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
    private BookingService bookingService;

    // ---------------- CREATE BOOKING ----------------
    @PostMapping("/book")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> createBooking(@Valid @RequestBody BookingRequest request,
                                           Authentication authentication) {
        logger.info("Entering createBooking() for rideId: {}", request.getRideId());
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        logger.debug("Passenger ID: {} requested booking", userPrincipal.getId());

        Booking booking = bookingService.createBooking(userPrincipal.getId(), request);
        logger.info("Booking created successfully with ID: {}", booking.getId());
        return ResponseEntity.ok(booking);
    }

    // ---------------- MY BOOKINGS ----------------
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

    // ---------------- BOOKINGS BY RIDE ----------------
    @GetMapping("/ride/{rideId}")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
    public ResponseEntity<?> getBookingsByRide(@PathVariable Long rideId) {
        logger.info("Entering getBookingsByRide() for rideId: {}", rideId);
        List<Booking> bookings = bookingService.getBookingsByRide(rideId);
        logger.info("Found {} bookings for rideId: {}", bookings.size(), rideId);
        return ResponseEntity.ok(bookings);
    }

    // ---------------- DRIVER BOOKINGS ----------------
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

    // ---------------- GET BOOKING BY ID ----------------
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PASSENGER', 'DRIVER', 'ADMIN')")
    public ResponseEntity<?> getBookingById(@PathVariable Long id) {
        logger.info("Entering getBookingById() for bookingId: {}", id);
        Booking booking = bookingService.getBookingById(id);
        logger.info("Booking found for ID: {}", id);
        return ResponseEntity.ok(booking);
    }

    // ---------------- CANCEL BOOKING ----------------
    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id, Authentication authentication) {
        logger.info("Entering cancelBooking() for bookingId: {}", id);
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        logger.debug("Passenger ID: {} attempting to cancel booking", userPrincipal.getId());

        Booking cancelledBooking = bookingService.cancelBooking(userPrincipal.getId(), id);
        List<Booking> myBookings = bookingService.getBookingsByPassenger(userPrincipal.getId());
        Ride updatedRide = cancelledBooking.getRide();

        CancelBookingResponse resp = new CancelBookingResponse(cancelledBooking, myBookings, updatedRide);
        logger.info("Booking with ID: {} cancelled successfully", id);
        return ResponseEntity.ok(resp);
    }

    // ✅ Response wrapper for cancel API
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
