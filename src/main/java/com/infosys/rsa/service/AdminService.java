package com.infosys.rsa.service;

import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.UserRepository;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.BookingRepository;
import com.infosys.rsa.repository.PaymentRepository;
import com.infosys.rsa.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminService {
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
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        driver.setIsApproved(true);
        User savedDriver = userRepository.save(driver);

        // Send approval email
        emailService.sendDriverApprovalNotification(driver.getEmail(), driver.getName(), true);

        return savedDriver;
    }

    @Transactional
    public User rejectDriver(Long driverId) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        driver.setIsApproved(false);
        User savedDriver = userRepository.save(driver);

        // Send rejection email
        emailService.sendDriverApprovalNotification(driver.getEmail(), driver.getName(), false);

        return savedDriver;
    }

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // Count only approved drivers (not pending ones)
        long totalDrivers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_DRIVER")))
                .filter(user -> user.getIsApproved() != null && user.getIsApproved()) // Only approved drivers
                .count();
        
        // Count all passengers (passengers don't need approval)
        long totalPassengers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_PASSENGER")))
                .count();
        
        // Total users = approved drivers + all passengers (excluding pending drivers)
        long totalUsers = totalDrivers + totalPassengers;
        
        // Count pending drivers (not yet reviewed)
        long pendingDrivers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_DRIVER")))
                .filter(user -> user.getIsApproved() == null) // Only drivers not yet reviewed
                .count();
        
        long totalRides = rideRepository.count();
        long totalBookings = bookingRepository.count();

        stats.put("totalUsers", totalUsers);
        stats.put("totalDrivers", totalDrivers);
        stats.put("totalPassengers", totalPassengers);
        stats.put("pendingDrivers", pendingDrivers);
        stats.put("totalRides", totalRides);
        stats.put("totalBookings", totalBookings);

        return stats;
    }

    public List<User> getAllPendingDrivers() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_DRIVER")))
                .filter(user -> user.getIsApproved() == null) // Only drivers not yet reviewed
                .toList();
    }

    public List<Map<String, Object>> getAllDrivers() {
        List<User> drivers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_DRIVER")))
                .filter(user -> user.getIsApproved() != null && user.getIsApproved())
                .toList();

        return drivers.stream().map(driver -> {
            Map<String, Object> driverInfo = new HashMap<>();
            driverInfo.put("id", driver.getId());
            driverInfo.put("name", driver.getName());
            driverInfo.put("email", driver.getEmail());
            driverInfo.put("phone", driver.getPhone());
            driverInfo.put("vehicleModel", driver.getVehicleModel());
            driverInfo.put("licensePlate", driver.getLicensePlate());
            driverInfo.put("driverRating", driver.getDriverRating() != null ? driver.getDriverRating() : 0.0);
            
            // Calculate total income from bookings (assuming 10% commission to company)
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
        List<User> passengers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_PASSENGER")))
                .toList();

        return passengers.stream().map(passenger -> {
            Map<String, Object> passengerInfo = new HashMap<>();
            passengerInfo.put("id", passenger.getId());
            passengerInfo.put("name", passenger.getName());
            passengerInfo.put("email", passenger.getEmail());
            passengerInfo.put("phone", passenger.getPhone());
            
            // Calculate total bookings and spending
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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Step 1: Delete ALL reviews associated with this user (as reviewer or reviewed)
        // This must be done early to break foreign key constraints
        List<com.infosys.rsa.model.Review> reviewerReviews = reviewRepository.findByReviewerId(userId);
        reviewerReviews.forEach(reviewRepository::delete);
        
        List<com.infosys.rsa.model.Review> reviewedReviews = reviewRepository.findAllByReviewedId(userId);
        reviewedReviews.forEach(reviewRepository::delete);

        // Step 2: Delete ALL payments associated with this user (as passenger or driver)
        // This must be done to break foreign key constraints
        List<com.infosys.rsa.model.Payment> passengerPayments = paymentRepository.findByPassengerIdOrderByCreatedAtDesc(userId);
        passengerPayments.forEach(paymentRepository::delete);
        
        List<com.infosys.rsa.model.Payment> driverPayments = paymentRepository.findByDriverIdOrderByCreatedAtDesc(userId);
        driverPayments.forEach(paymentRepository::delete);

        // Step 3: If user is a driver, delete their rides and associated bookings (including cancelled rides)
        if (user.getRoles().stream().anyMatch(role -> role.getName().name().equals("ROLE_DRIVER"))) {
            List<com.infosys.rsa.model.Ride> driverRides = rideRepository.findAllByDriverId(userId);
            for (com.infosys.rsa.model.Ride ride : driverRides) {
                // Get all bookings for this ride
                List<com.infosys.rsa.model.Booking> rideBookings = bookingRepository.findByRideId(ride.getId());
                for (com.infosys.rsa.model.Booking booking : rideBookings) {
                    // Delete reviews for this booking first (reviews reference bookings)
                    List<com.infosys.rsa.model.Review> bookingReviews = reviewRepository.findByBookingId(booking.getId());
                    bookingReviews.forEach(reviewRepository::delete);
                    
                    // Delete all payments for this booking (in case any were missed)
                    List<com.infosys.rsa.model.Payment> bookingPayments = paymentRepository.findByBookingId(booking.getId());
                    bookingPayments.forEach(paymentRepository::delete);
                    
                    // Then delete the booking
                    bookingRepository.delete(booking);
                }
                // Finally delete the ride
                rideRepository.delete(ride);
            }
        }

        // Step 4: Delete bookings where user is passenger (including cancelled bookings)
        // First, delete all reviews and payments for these bookings to avoid foreign key constraints
        List<com.infosys.rsa.model.Booking> passengerBookings = bookingRepository.findAllByPassengerId(userId);
        for (com.infosys.rsa.model.Booking booking : passengerBookings) {
            // Delete reviews for this booking first (reviews reference bookings)
            List<com.infosys.rsa.model.Review> bookingReviews = reviewRepository.findByBookingId(booking.getId());
            bookingReviews.forEach(reviewRepository::delete);
            
            // Delete all payments associated with this booking
            List<com.infosys.rsa.model.Payment> bookingPayments = paymentRepository.findByBookingId(booking.getId());
            bookingPayments.forEach(paymentRepository::delete);
            
            // Then delete the booking
            bookingRepository.delete(booking);
        }

        // Step 5: Clear user roles relationship (many-to-many)
        user.getRoles().clear();
        userRepository.save(user);

        // Step 6: Finally delete the user
        userRepository.delete(user);
    }
}

