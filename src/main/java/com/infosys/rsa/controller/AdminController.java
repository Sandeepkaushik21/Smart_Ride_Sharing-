package com.infosys.rsa.controller;

import com.infosys.rsa.model.User;
import com.infosys.rsa.service.AdminService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    @Autowired
    private AdminService adminService;

    @PostMapping("/drivers/{driverId}/approve")
    public ResponseEntity<?> approveDriver(@PathVariable Long driverId) {
        logger.info("AdminController | Approving driver with ID: {}", driverId);
        try {
            User driver = adminService.approveDriver(driverId);
            logger.info("Driver ID {} approved successfully", driverId);
            return ResponseEntity.ok(driver);
        } catch (RuntimeException e) {
            logger.error("Failed to approve driver ID {}: {}", driverId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/drivers/{driverId}/reject")
    public ResponseEntity<?> rejectDriver(@PathVariable Long driverId) {
        logger.info("AdminController | Rejecting driver with ID: {}", driverId);
        try {
            User driver = adminService.rejectDriver(driverId);
            logger.info("Driver ID {} rejected successfully", driverId);
            return ResponseEntity.ok(driver);
        } catch (RuntimeException e) {
            logger.error("Failed to reject driver ID {}: {}", driverId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats() {
        logger.info("AdminController | Fetching dashboard statistics");
        try {
            Map<String, Object> stats = adminService.getDashboardStats();
            logger.debug("Dashboard stats retrieved successfully: {}", stats);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Error retrieving dashboard stats: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(new ErrorResponse("Failed to fetch dashboard statistics"));
        }
    }

    @GetMapping("/drivers/pending")
    public ResponseEntity<?> getPendingDrivers() {
        logger.info("AdminController | Fetching all pending driver accounts");
        try {
            List<User> pendingDrivers = adminService.getAllPendingDrivers();
            logger.info("Pending drivers count: {}", pendingDrivers.size());
            return ResponseEntity.ok(pendingDrivers);
        } catch (Exception e) {
            logger.error("Error fetching pending drivers: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(new ErrorResponse("Failed to fetch pending drivers"));
        }
    }

    @GetMapping("/drivers/all")
    public ResponseEntity<?> getAllDrivers() {
        logger.info("AdminController | Fetching all approved drivers");
        try {
            List<Map<String, Object>> drivers = adminService.getAllDrivers();
            logger.info("Total approved drivers found: {}", drivers.size());
            return ResponseEntity.ok(drivers);
        } catch (Exception e) {
            logger.error("Error fetching all drivers: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(new ErrorResponse("Failed to fetch drivers"));
        }
    }

    @GetMapping("/passengers/all")
    public ResponseEntity<?> getAllPassengers() {
        logger.info("AdminController | Fetching all passengers");
        try {
            List<Map<String, Object>> passengers = adminService.getAllPassengers();
            logger.info("Total passengers found: {}", passengers.size());
            return ResponseEntity.ok(passengers);
        } catch (Exception e) {
            logger.error("Error fetching passengers: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(new ErrorResponse("Failed to fetch passengers"));
        }
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        logger.warn("AdminController | Deleting user with ID: {}", userId);
        try {
            adminService.deleteUser(userId);
            logger.info("User ID {} deleted successfully", userId);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        } catch (RuntimeException e) {
            logger.error("Failed to delete user ID {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    private static class ErrorResponse {
        private final String message;
        public ErrorResponse(String message) {
            this.message = message;
        }
        public String getMessage() {
            return message;
        }
    }
}
