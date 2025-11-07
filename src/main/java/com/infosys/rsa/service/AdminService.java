package com.infosys.rsa.service;

import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.UserRepository;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.BookingRepository;
import com.infosys.rsa.repository.PaymentRepository;
import com.infosys.rsa.repository.ReviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminService {

    private static final Logger logger = LoggerFactory.getLogger(AdminService.class);

    @Autowired
    UserRepository userRepository;

    @Autowired
    RideRepository rideRepository;

    @Autowired
    BookingRepository bookingRepository;

    @Autowired
    PaymentRepository paymentRepository;

    @Autowired
    ReviewRepository reviewRepository;

    @Autowired
    EmailService emailService;

    @Transactional
    public User approveDriver(Long driverId) {
        logger.info("Approving driver with ID: {}", driverId);
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> {
                    logger.error("Driver with ID {} not found for approval", driverId);
                    return new RuntimeException("Driver not found");
                });

        driver.setIsApproved(true);
        User savedDriver = userRepository.save(driver);
        logger.debug("Driver {} approved successfully in database", driverId);

        // Send approval email
        emailService.sendDriverApprovalNotification(driver.getEmail(), driver.getName(), true);
        logger.info("Approval email sent to driver: {}", driver.getEmail());

        return savedDriver;
    }

    @Transactional
    public User rejectDriver(Long driverId) {
        logger.info("Rejecting driver with ID: {}", driverId);
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> {
                    logger.error("Driver with ID {} not found for rejection", driverId);
                    return new RuntimeException("Driver not found");
                });

        driver.setIsApproved(false);
        User savedDriver = userRepository.save(driver);
        logger.debug("Driver {} marked as rejected in database", driverId);

        // Send rejection email
        emailService.sendDriverApprovalNotification(driver.getEmail(), driver.getName(), false);
        logger.info("Rejection email sent to driver: {}", driver.getEmail());

        return savedDriver;
    }

    public Map<String, Object> getDashboardStats() {
        logger.info("Fetching dashboard statistics");
        Map<String, Object> stats = new HashMap<>();

        long totalDrivers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_DRIVER")))
                .filter(user -> user.getIsApproved() != null && user.getIsApproved())
                .count();

        long totalPassengers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_PASSENGER")))
                .count();

        long totalUsers = totalDrivers + totalPassengers;

        long pendingDrivers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_DRIVER")))
                .filter(user -> user.getIsApproved() == null)
                .count();

        long totalRides = rideRepository.count();
        long totalBookings = bookingRepository.count();

        stats.put("totalUsers", totalUsers);
        stats.put("totalDrivers", totalDrivers);
        stats.put("totalPassengers", totalPassengers);
        stats.put("pendingDrivers", pendingDrivers);
        stats.put("totalRides", totalRides);
        stats.put("totalBookings", totalBookings);

        logger.debug("Dashboard stats calculated: {}", stats);
        logger.info("Dashboard statistics fetched successfully");

        return stats;
    }

    public List<User> getAllPendingDrivers() {
        logger.info("Fetching all pending drivers");
        List<User> pendingDrivers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_DRIVER")))
                .filter(user -> user.getIsApproved() == null)
                .toList();
        logger.debug("Found {} pending drivers", pendingDrivers.size());
        return pendingDrivers;
    }

    public List<Map<String, Object>> getAllDrivers() {
        logger.info("Fetching all approved drivers");
        List<User> drivers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_DRIVER")))
                .filter(user -> user.getIsApproved() != null && user.getIsApproved())
                .toList();

        logger.debug("Found {} approved drivers", drivers.size());

        return drivers.stream().map(driver -> {
            Map<String, Object> driverInfo = new HashMap<>();
            driverInfo.put("id", driver.getId());
            driverInfo.put("name", driver.getName());
            driverInfo.put("email", driver.getEmail());
            driverInfo.put("phone", driver.getPhone());
            driverInfo.put("vehicleModel", driver.getVehicleModel());
            driverInfo.put("licensePlate", driver.getLicensePlate());
            driverInfo.put("driverRating", driver.getDriverRating() != null ? driver.getDriverRating() : 0.0);

            double totalIncome = bookingRepository.findByRideDriverId(driver.getId()).stream()
                    .filter(booking -> booking.getStatus() == com.infosys.rsa.model.Booking.BookingStatus.CONFIRMED ||
                            booking.getStatus() == com.infosys.rsa.model.Booking.BookingStatus.COMPLETED)
                    .mapToDouble(booking -> booking.getFareAmount() != null ? booking.getFareAmount() * 0.10 : 0.0)
                    .sum();

            driverInfo.put("companyIncome", totalIncome);
            driverInfo.put("totalRides", rideRepository.findByDriverId(driver.getId()).size());
            return driverInfo;
        }).toList();
    }

    public List<Map<String, Object>> getAllPassengers() {
        logger.info("Fetching all passengers");
        List<User> passengers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_PASSENGER")))
                .toList();

        logger.debug("Found {} passengers", passengers.size());

        return passengers.stream().map(passenger -> {
            Map<String, Object> passengerInfo = new HashMap<>();
            passengerInfo.put("id", passenger.getId());
            passengerInfo.put("name", passenger.getName());
            passengerInfo.put("email", passenger.getEmail());
            passengerInfo.put("phone", passenger.getPhone());

            List<com.infosys.rsa.model.Booking> bookings = bookingRepository.findByPassengerId(passenger.getId());
            long totalBookings = bookings.stream()
                    .filter(booking -> booking.getStatus() == com.infosys.rsa.model.Booking.BookingStatus.CONFIRMED ||
                            booking.getStatus() == com.infosys.rsa.model.Booking.BookingStatus.COMPLETED)
                    .count();
            double totalSpending = bookings.stream()
                    .filter(booking -> booking.getStatus() == com.infosys.rsa.model.Booking.BookingStatus.CONFIRMED ||
                            booking.getStatus() == com.infosys.rsa.model.Booking.BookingStatus.COMPLETED)
                    .mapToDouble(booking -> booking.getFareAmount() != null ? booking.getFareAmount() : 0.0)
                    .sum();

            passengerInfo.put("totalBookings", totalBookings);
            passengerInfo.put("totalSpending", totalSpending);
            return passengerInfo;
        }).toList();
    }

    @Transactional
    public void deleteUser(Long userId) {
        logger.warn("Initiating delete process for user ID: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.error("User with ID {} not found for deletion", userId);
                    return new RuntimeException("User not found");
                });

        logger.debug("Deleting reviews for user ID: {}", userId);
        List<com.infosys.rsa.model.Review> reviewerReviews = reviewRepository.findByReviewerId(userId);
        reviewerReviews.forEach(reviewRepository::delete);
        List<com.infosys.rsa.model.Review> reviewedReviews = reviewRepository.findAllByReviewedId(userId);
        reviewedReviews.forEach(reviewRepository::delete);

        logger.debug("Deleting payments for user ID: {}", userId);
        List<com.infosys.rsa.model.Payment> passengerPayments = paymentRepository.findByPassengerIdOrderByCreatedAtDesc(userId);
        passengerPayments.forEach(paymentRepository::delete);
        List<com.infosys.rsa.model.Payment> driverPayments = paymentRepository.findByDriverIdOrderByCreatedAtDesc(userId);
        driverPayments.forEach(paymentRepository::delete);

        if (user.getRoles().stream().anyMatch(role -> role.getName().name().equals("ROLE_DRIVER"))) {
            logger.debug("Deleting rides and bookings for driver ID: {}", userId);
            List<com.infosys.rsa.model.Ride> driverRides = rideRepository.findAllByDriverId(userId);
            for (com.infosys.rsa.model.Ride ride : driverRides) {
                List<com.infosys.rsa.model.Booking> rideBookings = bookingRepository.findByRideId(ride.getId());
                for (com.infosys.rsa.model.Booking booking : rideBookings) {
                    List<com.infosys.rsa.model.Review> bookingReviews = reviewRepository.findByBookingId(booking.getId());
                    bookingReviews.forEach(reviewRepository::delete);
                    List<com.infosys.rsa.model.Payment> bookingPayments = paymentRepository.findByBookingId(booking.getId());
                    bookingPayments.forEach(paymentRepository::delete);
                    bookingRepository.delete(booking);
                }
                rideRepository.delete(ride);
            }
        }

        logger.debug("Deleting passenger-related bookings for user ID: {}", userId);
        List<com.infosys.rsa.model.Booking> passengerBookings = bookingRepository.findAllByPassengerId(userId);
        for (com.infosys.rsa.model.Booking booking : passengerBookings) {
            List<com.infosys.rsa.model.Review> bookingReviews = reviewRepository.findByBookingId(booking.getId());
            bookingReviews.forEach(reviewRepository::delete);
            List<com.infosys.rsa.model.Payment> bookingPayments = paymentRepository.findByBookingId(booking.getId());
            bookingPayments.forEach(paymentRepository::delete);
            bookingRepository.delete(booking);
        }

        user.getRoles().clear();
        userRepository.save(user);

        userRepository.delete(user);
        logger.info("User with ID {} deleted successfully", userId);
    }
}
