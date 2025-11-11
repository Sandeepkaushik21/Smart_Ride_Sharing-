package com.infosys.rsa.service;

import com.infosys.rsa.dto.BookingRequest;
import com.infosys.rsa.exception.*;
import com.infosys.rsa.model.Booking;
import com.infosys.rsa.model.Ride;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.BookingRepository;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BookingService {

    private static final Logger logger = LoggerFactory.getLogger(BookingService.class);

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private RideRepository rideRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FareCalculationService fareCalculationService;

    @Autowired
    private EmailService emailService;

    // ---------------- CREATE BOOKING ----------------
    @Transactional
    public Booking createBooking(Long passengerId, BookingRequest request) {
        logger.info("Attempting to create booking for passenger ID: {} and ride ID: {}", passengerId, request.getRideId());

        // Ride validation
        Ride ride = rideRepository.findById(request.getRideId())
                .orElseThrow(() -> {
                    logger.error("Ride not found with ID: {}", request.getRideId());
                    return new RideNotFoundException("Ride not found with ID: " + request.getRideId());
                });

        int numberOfSeats = request.getNumberOfSeats() != null ? request.getNumberOfSeats() : 1;
        logger.debug("Requested number of seats: {}, available seats: {}", numberOfSeats, ride.getAvailableSeats());

        if (ride.getAvailableSeats() < numberOfSeats) {
            logger.error("Not enough seats for booking. Requested: {}, Available: {}", numberOfSeats, ride.getAvailableSeats());
            throw new InsufficientSeatsException("Not enough seats available. Only " + ride.getAvailableSeats() + " seat(s) remaining.");
        }

        // Passenger validation
        User passenger = userRepository.findById(passengerId)
                .orElseThrow(() -> {
                    logger.error("Passenger not found with ID: {}", passengerId);
                    return new PassengerNotFoundException("Passenger not found with ID: " + passengerId);
                });

        // Location validation
        String pickupLocation = request.getPickupLocation();
        String dropoffLocation = request.getDropoffLocation();

        if (pickupLocation == null || pickupLocation.trim().isEmpty()) {
            logger.error("Pickup location missing for passenger ID: {}", passengerId);
            throw new InvalidLocationException("Pickup location is required.");
        }
        if (dropoffLocation == null || dropoffLocation.trim().isEmpty()) {
            logger.error("Dropoff location missing for passenger ID: {}", passengerId);
            throw new InvalidLocationException("Dropoff location is required.");
        }

        // Prevent duplicate bookings for same ride
        boolean alreadyBooked = bookingRepository.existsByRideIdAndPassengerId(request.getRideId(), passengerId);
        if (alreadyBooked) {
            logger.warn("Duplicate booking attempt detected for passenger ID: {} and ride ID: {}", passengerId, request.getRideId());
            throw new DuplicateBookingException("You have already booked this ride.");
        }

        // Fare calculation
        double passengerDistance = fareCalculationService.calculateDistance(pickupLocation, dropoffLocation);
        double farePerSeat = fareCalculationService.calculateFare(passengerDistance);
        double totalFareAmount = farePerSeat * numberOfSeats;
        logger.debug("Fare calculated: Distance = {}, Fare per seat = {}, Total = {}", passengerDistance, farePerSeat, totalFareAmount);

        // Booking creation
        Booking booking = new Booking();
        booking.setRide(ride);
        booking.setPassenger(passenger);
        booking.setPickupLocation(pickupLocation);
        booking.setDropoffLocation(dropoffLocation);
        booking.setDistanceCovered(passengerDistance);
        booking.setFareAmount(totalFareAmount);
        booking.setNumberOfSeats(numberOfSeats);
        booking.setStatus(Booking.BookingStatus.PENDING);

        Booking savedBooking = bookingRepository.save(booking);
        logger.info("Booking created successfully with ID: {} for passenger ID: {}", savedBooking.getId(), passengerId);

        return savedBooking;
    }

    // ---------------- GET BOOKINGS ----------------
    public List<Booking> getBookingsByPassenger(Long passengerId) {
        logger.info("Fetching bookings for passenger ID: {}", passengerId);
        List<Booking> bookings = bookingRepository.findByPassengerId(passengerId);
        logger.debug("Found {} bookings for passenger ID: {}", bookings.size(), passengerId);
        return bookings;
    }

    public List<Booking> getBookingsByRide(Long rideId) {
        logger.info("Fetching bookings for ride ID: {}", rideId);
        List<Booking> bookings = bookingRepository.findByRideId(rideId);
        logger.debug("Found {} bookings for ride ID: {}", bookings.size(), rideId);
        return bookings;
    }

    public List<Booking> getBookingsByDriver(Long driverId) {
        logger.info("Fetching bookings for driver ID: {}", driverId);
        List<Booking> bookings = bookingRepository.findByRideDriverId(driverId);
        logger.debug("Found {} bookings for driver ID: {}", bookings.size(), driverId);
        return bookings;
    }

    public Booking getBookingById(Long bookingId) {
        logger.info("Fetching booking by ID: {}", bookingId);
        Booking booking = bookingRepository.findByIdWithRide(bookingId)
                .orElseThrow(() -> {
                    logger.error("Booking not found with ID: {}", bookingId);
                    return new RideNotFoundException("Booking not found with ID: " + bookingId);
                });
        logger.debug("Booking found: {}", booking.getId());
        return booking;
    }

    // ---------------- CANCEL BOOKING ----------------
    @Transactional
    public Booking cancelBooking(Long passengerId, Long bookingId) {
        logger.warn("Attempting to cancel booking ID: {} for passenger ID: {}", bookingId, passengerId);

        Booking booking = bookingRepository.findByIdWithRide(bookingId)
                .orElseThrow(() -> {
                    logger.error("Booking not found with ID: {}", bookingId);
                    return new RideNotFoundException("Booking not found with ID: " + bookingId);
                });

        if (!booking.getPassenger().getId().equals(passengerId)) {
            logger.error("Unauthorized cancellation attempt by passenger ID: {}", passengerId);
            throw new PassengerNotFoundException("You can only cancel your own bookings.");
        }

        if (booking.getStatus() == Booking.BookingStatus.CANCELLED) {
            logger.warn("Booking ID: {} is already cancelled", bookingId);
            throw new DuplicateBookingException("Booking is already cancelled.");
        }

        if (booking.getStatus() == Booking.BookingStatus.COMPLETED) {
            logger.error("Cannot cancel completed booking ID: {}", bookingId);
            throw new InvalidLocationException("Cannot cancel a completed booking.");
        }

        Ride ride = booking.getRide();
        int seatsToRestore = booking.getNumberOfSeats() != null ? booking.getNumberOfSeats() : 1;
        ride.setAvailableSeats(ride.getAvailableSeats() + seatsToRestore);
        rideRepository.save(ride);

        booking.setStatus(Booking.BookingStatus.CANCELLED);
        Booking updatedBooking = bookingRepository.save(booking);

        logger.info("Booking ID: {} cancelled successfully. Restored {} seat(s) to ride ID: {}", bookingId, seatsToRestore, ride.getId());
        return updatedBooking;
    }

    // ---------------- CANCEL RIDE ----------------
    @Transactional
    public Ride cancelRideForDriver(Long driverId, Long rideId) {
        logger.warn("Driver ID: {} attempting to cancel ride ID: {}", driverId, rideId);

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> {
                    logger.error("Ride not found with ID: {}", rideId);
                    return new RideNotFoundException("Ride not found with ID: " + rideId);
                });

        if (!ride.getDriver().getId().equals(driverId)) {
            logger.error("Unauthorized ride cancellation attempt by driver ID: {}", driverId);
            throw new PassengerNotFoundException("You can only cancel your own rides.");
        }

        if (ride.getStatus() == Ride.RideStatus.CANCELLED) {
            logger.warn("Ride ID: {} is already cancelled", rideId);
            throw new DuplicateBookingException("Ride is already cancelled.");
        }

        if (ride.getStatus() == Ride.RideStatus.COMPLETED) {
            logger.error("Cannot cancel completed ride ID: {}", rideId);
            throw new InvalidLocationException("Cannot cancel a completed ride.");
        }

        List<Booking> bookings = bookingRepository.findByRideId(rideId);
        logger.debug("Cancelling {} bookings associated with ride ID: {}", bookings.size(), rideId);

        for (Booking booking : bookings) {
            if (booking.getStatus() != Booking.BookingStatus.CANCELLED
                    && booking.getStatus() != Booking.BookingStatus.COMPLETED) {
                booking.setStatus(Booking.BookingStatus.CANCELLED);
                bookingRepository.save(booking);
                logger.debug("Booking ID: {} marked as CANCELLED", booking.getId());
            }
        }

        ride.setStatus(Ride.RideStatus.CANCELLED);
        Ride updatedRide = rideRepository.save(ride);

        logger.info("Ride ID: {} cancelled successfully by driver ID: {}", rideId, driverId);
        return updatedRide;
    }
}
