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

        // Calculate fare for passenger
        String pickupLocation = request.getPickupLocation() != null ? request.getPickupLocation() : ride.getSource();
        String dropoffLocation = request.getDropoffLocation() != null ? request.getDropoffLocation() : ride.getDestination();
        
        double passengerDistance = fareCalculationService.calculateDistance(pickupLocation, dropoffLocation);
        double totalFare = ride.getEstimatedFare();
        double totalDistance = ride.getTotalDistance();
        double farePerSeat = fareCalculationService.calculateProportionalFare(totalFare, totalDistance, passengerDistance);
        double totalFareAmount = farePerSeat * numberOfSeats;

        Booking booking = new Booking();
        booking.setRide(ride);
        booking.setPassenger(passenger);
        booking.setPickupLocation(pickupLocation);
        booking.setDropoffLocation(dropoffLocation);
        booking.setDistanceCovered(passengerDistance);
        booking.setFareAmount(totalFareAmount);
        booking.setNumberOfSeats(numberOfSeats);
        booking.setStatus(Booking.BookingStatus.CONFIRMED);

        // Update ride available seats
        ride.setAvailableSeats(ride.getAvailableSeats() - numberOfSeats);
        rideRepository.save(ride);

        Booking savedBooking = bookingRepository.save(booking);

        // Send confirmation emails when booking is accepted
        // Notify passenger that their booking was accepted
        emailService.sendBookingConfirmation(passenger.getEmail(), passenger.getName(),
                ride.getSource(), ride.getDestination(), 
                ride.getDate().toString(), ride.getTime().toString());
        
        // Notify driver that someone booked their ride
        emailService.sendRideBookingNotification(ride.getDriver().getEmail(), 
                ride.getDriver().getName(), passenger.getName(),
                ride.getSource(), ride.getDestination(), 
                ride.getDate().toString(), ride.getTime().toString());

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

