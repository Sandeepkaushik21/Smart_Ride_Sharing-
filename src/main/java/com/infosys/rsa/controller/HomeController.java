package com.infosys.rsa.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
public class HomeController {

    @GetMapping("/")
    public ResponseEntity<?> home() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Welcome to Smart Ride Sharing System API");
        response.put("status", "running");
        response.put("version", "1.0.0");
        response.put("endpoints", Map.of(
            "auth", "/api/auth/**",
            "public", "/api/public/**",
            "admin", "/api/admin/**",
            "driver", "/api/driver/**",
            "passenger", "/api/passenger/**",
            "rides", "/api/rides/**",
            "bookings", "/api/bookings/**"
        ));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/public/health")
    public ResponseEntity<?> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("message", "Smart Ride Sharing System is running");
        return ResponseEntity.ok(response);
    }
}

