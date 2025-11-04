package com.infosys.rsa.controller;

import com.infosys.rsa.dto.BookingRequest;
import com.infosys.rsa.model.Booking;
import com.infosys.rsa.model.Ride;
import com.infosys.rsa.security.UserDetailsServiceImpl.UserPrincipal;
import com.infosys.rsa.service.BookingService;
import jakarta.validation.Valid;
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
    @Autowired
    BookingService bookingService;

    @PostMapping("/book")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> createBooking(@Valid @RequestBody BookingRequest request,
                                           Authentication authentication) {
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Booking booking = bookingService.createBooking(userPrincipal.getId(), request);
            return ResponseEntity.ok(booking);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/my-bookings")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> getMyBookings(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        List<Booking> bookings = bookingService.getBookingsByPassenger(userPrincipal.getId());
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/ride/{rideId}")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
    public ResponseEntity<?> getBookingsByRide(@PathVariable Long rideId) {
        List<Booking> bookings = bookingService.getBookingsByRide(rideId);
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/driver-bookings")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> getDriverBookings(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        List<Booking> bookings = bookingService.getBookingsByDriver(userPrincipal.getId());
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PASSENGER', 'DRIVER', 'ADMIN')")
    public ResponseEntity<?> getBookingById(@PathVariable Long id) {
        try {
            Booking booking = bookingService.getBookingById(id);
            return ResponseEntity.ok(booking);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id, Authentication authentication) {
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Booking booking = bookingService.cancelBooking(userPrincipal.getId(), id);

            // Return updated passenger bookings and updated ride to refresh UI
            List<Booking> myBookings = bookingService.getBookingsByPassenger(userPrincipal.getId());
            Ride updatedRide = booking.getRide();

            CancelBookingResponse resp = new CancelBookingResponse(booking, myBookings, updatedRide);
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
