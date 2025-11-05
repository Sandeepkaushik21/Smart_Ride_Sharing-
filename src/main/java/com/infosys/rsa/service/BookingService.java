package com.infosys.rsa.service;

import com.infosys.rsa.dto.BookingRequest;
import com.infosys.rsa.model.Booking;
import com.infosys.rsa.model.Ride;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.BookingRepository;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BookingService {
    @Autowired
    BookingRepository bookingRepository;

    @Autowired
    RideRepository rideRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    FareCalculationService fareCalculationService;

    @Autowired
    EmailService emailService;

    @Transactional
    public Booking createBooking(Long passengerId, BookingRequest request) {
        Ride ride = rideRepository.findById(request.getRideId())
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        int numberOfSeats = request.getNumberOfSeats() != null ? request.getNumberOfSeats() : 1;
        
        if (ride.getAvailableSeats() < numberOfSeats) {
            throw new RuntimeException("Not enough seats available. Only " + ride.getAvailableSeats() + " seat(s) remaining.");
        }

        User passenger = userRepository.findById(passengerId)
                .orElseThrow(() -> new RuntimeException("Passenger not found"));

        // Calculate fare based ONLY on passenger's pickup and dropoff locations (step 2 locations)
        // Not proportional to ride distance - direct calculation from passenger's specific route
        String pickupLocation = request.getPickupLocation();
        String dropoffLocation = request.getDropoffLocation();
        
        if (pickupLocation == null || pickupLocation.trim().isEmpty()) {
            throw new RuntimeException("Pickup location is required");
        }
        if (dropoffLocation == null || dropoffLocation.trim().isEmpty()) {
            throw new RuntimeException("Dropoff location is required");
        }
        
        // Calculate distance and fare directly from passenger's pickup to dropoff
        double passengerDistance = fareCalculationService.calculateDistance(pickupLocation, dropoffLocation);
        double farePerSeat = fareCalculationService.calculateFare(passengerDistance);
        double totalFareAmount = farePerSeat * numberOfSeats;

        Booking booking = new Booking();
        booking.setRide(ride);
        booking.setPassenger(passenger);
        booking.setPickupLocation(pickupLocation);
        booking.setDropoffLocation(dropoffLocation);
        booking.setDistanceCovered(passengerDistance);
        booking.setFareAmount(totalFareAmount);
        booking.setNumberOfSeats(numberOfSeats);
        // Booking starts as PENDING until payment is verified
        booking.setStatus(Booking.BookingStatus.PENDING);

        // Don't update available seats yet - will be updated after payment confirmation
        // ride.setAvailableSeats(ride.getAvailableSeats() - numberOfSeats);
        // rideRepository.save(ride);

        Booking savedBooking = bookingRepository.save(booking);

        // Don't send emails yet - will be sent after payment confirmation
        // Email will be sent in RazorpayPaymentService after payment verification

        return savedBooking;
    }

    public List<Booking> getBookingsByPassenger(Long passengerId) {
        return bookingRepository.findByPassengerId(passengerId);
    }

    public List<Booking> getBookingsByRide(Long rideId) {
        return bookingRepository.findByRideId(rideId);
    }

    public List<Booking> getBookingsByDriver(Long driverId) {
        return bookingRepository.findByRideDriverId(driverId);
    }

    public Booking getBookingById(Long bookingId) {
        return bookingRepository.findByIdWithRide(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
    }

    @Transactional
    public Booking cancelBooking(Long passengerId, Long bookingId) {
        Booking booking = bookingRepository.findByIdWithRide(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getPassenger().getId().equals(passengerId)) {
            throw new RuntimeException("You can only cancel your own bookings");
        }

        if (booking.getStatus() == Booking.BookingStatus.CANCELLED) {
            throw new RuntimeException("Booking is already cancelled");
        }

        if (booking.getStatus() == Booking.BookingStatus.COMPLETED) {
            throw new RuntimeException("Cannot cancel a completed booking");
        }

        // Update ride available seats when booking is cancelled
        Ride ride = booking.getRide();
        int seatsToRestore = booking.getNumberOfSeats() != null ? booking.getNumberOfSeats() : 1;
        ride.setAvailableSeats(ride.getAvailableSeats() + seatsToRestore);
        rideRepository.save(ride);

        booking.setStatus(Booking.BookingStatus.CANCELLED);

        return bookingRepository.save(booking);
    }

    @Transactional
    public Ride cancelRideForDriver(Long driverId, Long rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driverId)) {
            throw new RuntimeException("You can only cancel your own rides");
        }

        if (ride.getStatus() == Ride.RideStatus.CANCELLED) {
            throw new RuntimeException("Ride is already cancelled");
        }

        if (ride.getStatus() == Ride.RideStatus.COMPLETED) {
            throw new RuntimeException("Cannot cancel a completed ride");
        }

        // Cancel all bookings for this ride
        List<Booking> bookings = bookingRepository.findByRideId(rideId);
        for (Booking booking : bookings) {
            if (booking.getStatus() != Booking.BookingStatus.CANCELLED 
                    && booking.getStatus() != Booking.BookingStatus.COMPLETED) {
                booking.setStatus(Booking.BookingStatus.CANCELLED);
                bookingRepository.save(booking);
            }
        }

        ride.setStatus(Ride.RideStatus.CANCELLED);
        return rideRepository.save(ride);
    }
}

