package com.infosys.rsa.service;

import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.UserRepository;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.BookingRepository;
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
        
        long totalUsers = userRepository.count();
        long totalDrivers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_DRIVER")))
                .count();
        long totalPassengers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_PASSENGER")))
                .count();
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

        // Delete all bookings associated with this user
        if (user.getRoles().stream().anyMatch(role -> role.getName().name().equals("ROLE_DRIVER"))) {
            // If driver, delete their rides and bookings
            rideRepository.findByDriverId(userId).forEach(ride -> {
                bookingRepository.findByRideId(ride.getId()).forEach(bookingRepository::delete);
                rideRepository.delete(ride);
            });
        }

        // Delete bookings where user is passenger
        bookingRepository.findByPassengerId(userId).forEach(bookingRepository::delete);

        // Finally delete the user
        userRepository.delete(user);
    }
}

