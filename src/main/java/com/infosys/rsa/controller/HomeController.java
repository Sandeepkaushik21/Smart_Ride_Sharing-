package com.infosys.rsa.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
public class HomeController {

    private static final Logger logger = LoggerFactory.getLogger(HomeController.class);

    @GetMapping("/")
    public ResponseEntity<?> home() {
        logger.info("Entering home() endpoint");
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
        logger.info("Home endpoint accessed successfully, returning system info response");
        logger.debug("Home response content: {}", response);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/public/health")
    public ResponseEntity<?> health() {
        logger.info("Entering health() endpoint");
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("message", "Smart Ride Sharing System is running");
        logger.info("Health check successful, system status: {}", response.get("status"));
        return ResponseEntity.ok(response);
    }
}
