package com.infosys.rsa.controller;

import com.infosys.rsa.model.User;
import com.infosys.rsa.service.AdminService;
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
    @Autowired
    AdminService adminService;

    @PostMapping("/drivers/{driverId}/approve")
    public ResponseEntity<?> approveDriver(@PathVariable Long driverId) {
        try {
            User driver = adminService.approveDriver(driverId);
            return ResponseEntity.ok(driver);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/drivers/{driverId}/reject")
    public ResponseEntity<?> rejectDriver(@PathVariable Long driverId) {
        try {
            User driver = adminService.rejectDriver(driverId);
            return ResponseEntity.ok(driver);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats() {
        Map<String, Object> stats = adminService.getDashboardStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/drivers/pending")
    public ResponseEntity<?> getPendingDrivers() {
        List<User> pendingDrivers = adminService.getAllPendingDrivers();
        return ResponseEntity.ok(pendingDrivers);
    }

    @GetMapping("/drivers/all")
    public ResponseEntity<?> getAllDrivers() {
        List<Map<String, Object>> drivers = adminService.getAllDrivers();
        return ResponseEntity.ok(drivers);
    }

    @GetMapping("/passengers/all")
    public ResponseEntity<?> getAllPassengers() {
        List<Map<String, Object>> passengers = adminService.getAllPassengers();
        return ResponseEntity.ok(passengers);
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
}

