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
                .filter(user -> !user.getIsApproved())
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
                .filter(user -> !user.getIsApproved())
                .toList();
    }
}

