package com.infosys.rsa.service;

import com.infosys.rsa.dto.BookingRequest;
import com.infosys.rsa.dto.UpdateBookingLocationsRequest;
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

    public List<Booking> getPendingBookingsByDriver(Long driverId) {
        logger.info("Fetching pending bookings for driver ID: {}", driverId);
        List<Booking> allBookings = bookingRepository.findByRideDriverId(driverId);
        List<Booking> pendingBookings = allBookings.stream()
                .filter(b -> b.getStatus() == Booking.BookingStatus.PENDING)
                .toList();
        logger.debug("Found {} pending bookings for driver ID: {}", pendingBookings.size(), driverId);
        return pendingBookings;
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

        // Send email notification to driver about booking cancellation
        try {
            User driver = ride.getDriver();
            User passenger = booking.getPassenger();
            String dateStr = ride.getDate() != null ? ride.getDate().toString() : "N/A";
            String timeStr = ride.getTime() != null ? ride.getTime().toString() : "N/A";
            
            emailService.sendBookingCancellationNotification(
                    driver.getEmail(),
                    driver.getName() != null ? driver.getName() : driver.getEmail(),
                    passenger.getName() != null ? passenger.getName() : passenger.getEmail(),
                    booking.getPickupLocation(),
                    booking.getDropoffLocation(),
                    dateStr,
                    timeStr
            );
        } catch (Exception e) {
            logger.error("Failed to send booking cancellation email notification: {}", e.getMessage());
            // Don't fail the transaction if email fails
        }

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

        // Send cancellation notifications to all passengers
        String dateStr = ride.getDate() != null ? ride.getDate().toString() : "N/A";
        String timeStr = ride.getTime() != null ? ride.getTime().toString() : "N/A";
        String driverName = ride.getDriver().getName() != null ? ride.getDriver().getName() : ride.getDriver().getEmail();

        for (Booking booking : bookings) {
            if (booking.getStatus() != Booking.BookingStatus.CANCELLED
                    && booking.getStatus() != Booking.BookingStatus.COMPLETED) {
                booking.setStatus(Booking.BookingStatus.CANCELLED);
                bookingRepository.save(booking);
                logger.debug("Booking ID: {} marked as CANCELLED", booking.getId());

                // Send email notification to passenger
                try {
                    User passenger = booking.getPassenger();
                    String passengerName = passenger.getName() != null ? passenger.getName() : passenger.getEmail();
                    
                    emailService.sendRideCancellationNotification(
                            passenger.getEmail(),
                            passengerName,
                            driverName,
                            booking.getPickupLocation() != null ? booking.getPickupLocation() : ride.getSource(),
                            booking.getDropoffLocation() != null ? booking.getDropoffLocation() : ride.getDestination(),
                            dateStr,
                            timeStr,
                            null // No specific reason provided
                    );
                } catch (Exception e) {
                    logger.error("Failed to send ride cancellation email notification to passenger {}: {}", 
                            booking.getPassenger().getEmail(), e.getMessage());
                    // Don't fail the transaction if email fails
                }
            }
        }

        ride.setStatus(Ride.RideStatus.CANCELLED);
        Ride updatedRide = rideRepository.save(ride);

        logger.info("Ride ID: {} cancelled successfully by driver ID: {}", rideId, driverId);
        return updatedRide;
    }

    // ---------------- ACCEPT BOOKING ---------------- 
    @Transactional
    public Booking acceptBooking(Long driverId, Long bookingId) {
        logger.info("Driver ID: {} attempting to accept booking ID: {}", driverId, bookingId);

        Booking booking = bookingRepository.findByIdWithRide(bookingId)
                .orElseThrow(() -> {
                    logger.error("Booking not found with ID: {}", bookingId);
                    return new RideNotFoundException("Booking not found with ID: " + bookingId);
                });

        // Verify driver owns the ride
        if (!booking.getRide().getDriver().getId().equals(driverId)) {
            logger.error("Unauthorized booking acceptance attempt by driver ID: {}", driverId);
            throw new PassengerNotFoundException("You can only accept bookings for your own rides.");
        }

        if (booking.getStatus() != Booking.BookingStatus.PENDING) {
            logger.error("Booking ID: {} is not in PENDING status. Current status: {}", bookingId, booking.getStatus());
            throw new InvalidLocationException("Only pending bookings can be accepted.");
        }

        // Check if there are still enough seats
        Ride ride = booking.getRide();
        if (ride.getAvailableSeats() < booking.getNumberOfSeats()) {
            logger.error("Not enough seats available for booking ID: {}", bookingId);
            throw new InsufficientSeatsException("Not enough seats available. Only " + ride.getAvailableSeats() + " seat(s) remaining.");
        }

        booking.setStatus(Booking.BookingStatus.ACCEPTED);
        Booking updatedBooking = bookingRepository.save(booking);

        // Send email notification to passenger
        try {
            User passenger = booking.getPassenger();
            User driver = ride.getDriver();
            String dateStr = ride.getDate() != null ? ride.getDate().toString() : "N/A";
            String timeStr = ride.getTime() != null ? ride.getTime().toString() : "N/A";
            
            emailService.sendDriverAcceptanceNotification(
                    passenger.getEmail(),
                    passenger.getName() != null ? passenger.getName() : passenger.getEmail(),
                    driver.getName() != null ? driver.getName() : driver.getEmail(),
                    booking.getPickupLocation(),
                    booking.getDropoffLocation(),
                    dateStr,
                    timeStr,
                    booking.getFareAmount()
            );
        } catch (Exception e) {
            logger.error("Failed to send acceptance email notification: {}", e.getMessage());
            // Don't fail the transaction if email fails
        }

        logger.info("Booking ID: {} accepted successfully by driver ID: {}", bookingId, driverId);
        return updatedBooking;
    }

    // ---------------- DECLINE BOOKING ---------------- 
    @Transactional
    public Booking declineBooking(Long driverId, Long bookingId) {
        logger.info("Driver ID: {} attempting to decline booking ID: {}", driverId, bookingId);

        Booking booking = bookingRepository.findByIdWithRide(bookingId)
                .orElseThrow(() -> {
                    logger.error("Booking not found with ID: {}", bookingId);
                    return new RideNotFoundException("Booking not found with ID: " + bookingId);
                });

        // Verify driver owns the ride
        if (!booking.getRide().getDriver().getId().equals(driverId)) {
            logger.error("Unauthorized booking decline attempt by driver ID: {}", driverId);
            throw new PassengerNotFoundException("You can only decline bookings for your own rides.");
        }

        if (booking.getStatus() != Booking.BookingStatus.PENDING) {
            logger.error("Booking ID: {} is not in PENDING status. Current status: {}", bookingId, booking.getStatus());
            throw new InvalidLocationException("Only pending bookings can be declined.");
        }

        booking.setStatus(Booking.BookingStatus.CANCELLED);
        Booking updatedBooking = bookingRepository.save(booking);

        logger.info("Booking ID: {} declined successfully by driver ID: {}", bookingId, driverId);
        return updatedBooking;
    }

    // ---------------- RIDE HISTORY ---------------- 
    public List<Booking> getRideHistoryByPassenger(Long passengerId) {
        logger.info("Fetching ride history for passenger ID: {}", passengerId);
        List<Booking> allBookings = bookingRepository.findAllByPassengerId(passengerId);
        List<Booking> history = allBookings.stream()
                .filter(b -> b.getStatus() == Booking.BookingStatus.COMPLETED || 
                            b.getStatus() == Booking.BookingStatus.CANCELLED ||
                            b.getStatus() == Booking.BookingStatus.CONFIRMED)
                .toList();
        logger.debug("Found {} historical bookings for passenger ID: {}", history.size(), passengerId);
        return history;
    }

    public List<Booking> getRideHistoryByDriver(Long driverId) {
        logger.info("Fetching ride history for driver ID: {}", driverId);
        List<Booking> allBookings = bookingRepository.findAllByRideDriverId(driverId);
        List<Booking> history = allBookings.stream()
                .filter(b -> b.getStatus() == Booking.BookingStatus.COMPLETED || 
                            b.getStatus() == Booking.BookingStatus.CANCELLED ||
                            b.getStatus() == Booking.BookingStatus.CONFIRMED)
                .toList();
        logger.debug("Found {} historical bookings for driver ID: {}", history.size(), driverId);
        return history;
    }

    // ---------------- UPDATE BOOKING LOCATIONS (FOR TRAVELING PASSENGERS) ---------------- 
    @Transactional
    public Booking updateBookingLocations(Long passengerId, Long bookingId, UpdateBookingLocationsRequest request) {
        logger.info("Attempting to update locations for booking ID: {} by passenger ID: {}", bookingId, passengerId);

        Booking booking = bookingRepository.findByIdWithRide(bookingId)
                .orElseThrow(() -> {
                    logger.error("Booking not found with ID: {}", bookingId);
                    return new RideNotFoundException("Booking not found with ID: " + bookingId);
                });

        // Verify passenger owns the booking
        if (!booking.getPassenger().getId().equals(passengerId)) {
            logger.error("Unauthorized location update attempt by passenger ID: {}", passengerId);
            throw new PassengerNotFoundException("You can only update locations for your own bookings.");
        }

        // Only allow updates for CONFIRMED bookings (traveling passengers)
        if (booking.getStatus() != Booking.BookingStatus.CONFIRMED) {
            logger.error("Booking ID: {} is not in CONFIRMED status. Current status: {}", bookingId, booking.getStatus());
            throw new InvalidLocationException("You can only update locations for confirmed bookings while traveling.");
        }

        Ride ride = booking.getRide();
        List<String> driverPickupLocations = ride.getPickupLocationsList();
        List<String> driverDropLocations = ride.getDropLocationsList();

        // Validate that selected locations are from driver's choices
        if (!driverPickupLocations.contains(request.getPickupLocation1())) {
            logger.error("Pickup location 1 '{}' is not in driver's pickup locations", request.getPickupLocation1());
            throw new InvalidLocationException("Pickup location 1 must be selected from the driver's available pickup locations.");
        }

        if (request.getPickupLocation2() != null && !request.getPickupLocation2().trim().isEmpty()) {
            if (!driverPickupLocations.contains(request.getPickupLocation2())) {
                logger.error("Pickup location 2 '{}' is not in driver's pickup locations", request.getPickupLocation2());
                throw new InvalidLocationException("Pickup location 2 must be selected from the driver's available pickup locations.");
            }
            // Ensure pickup locations are different
            if (request.getPickupLocation1().equals(request.getPickupLocation2())) {
                logger.error("Pickup locations 1 and 2 are the same");
                throw new InvalidLocationException("Pickup location 1 and pickup location 2 must be different.");
            }
        }

        if (!driverDropLocations.contains(request.getDropLocation())) {
            logger.error("Drop location '{}' is not in driver's drop locations", request.getDropLocation());
            throw new InvalidLocationException("Drop location must be selected from the driver's available drop locations.");
        }

        // Update booking locations
        booking.setPickupLocation(request.getPickupLocation1());
        booking.setPickupLocation2(request.getPickupLocation2() != null && !request.getPickupLocation2().trim().isEmpty() 
                ? request.getPickupLocation2() : null);
        booking.setDropoffLocation(request.getDropLocation());

        // Recalculate fare based on new locations (use first pickup and drop for distance calculation)
        double passengerDistance = fareCalculationService.calculateDistance(request.getPickupLocation1(), request.getDropLocation());
        double farePerSeat = fareCalculationService.calculateFare(passengerDistance);
        double totalFareAmount = farePerSeat * booking.getNumberOfSeats();
        booking.setDistanceCovered(passengerDistance);
        booking.setFareAmount(totalFareAmount);

        Booking updatedBooking = bookingRepository.save(booking);
        logger.info("Booking locations updated successfully for booking ID: {}", bookingId);
        return updatedBooking;
    }
}
