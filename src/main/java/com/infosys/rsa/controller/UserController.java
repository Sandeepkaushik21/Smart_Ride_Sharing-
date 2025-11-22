package com.infosys.rsa.controller;

import com.infosys.rsa.model.User;
import com.infosys.rsa.security.UserDetailsServiceImpl.UserPrincipal;
import com.infosys.rsa.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/user")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    @Autowired
    UserService userService;

    @GetMapping("/profile")
    @PreAuthorize("hasAnyRole('PASSENGER', 'DRIVER', 'ADMIN')")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        logger.info("Entering getProfile()");
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        logger.debug("Fetching profile for userId: {}", userPrincipal.getId());
        User user = userService.getUserById(userPrincipal.getId());
        logger.info("Profile fetched successfully for userId: {}", userPrincipal.getId());
        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    @PreAuthorize("hasAnyRole('PASSENGER', 'DRIVER', 'ADMIN')")
    public ResponseEntity<?> updateProfile(@RequestBody User userDetails,
                                           Authentication authentication) {
        logger.info("Entering updateProfile()");
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Updating profile for userId: {}", userPrincipal.getId());
            User updatedUser = userService.updateUserProfile(userPrincipal.getId(), userDetails);
            logger.info("Profile updated successfully for userId: {}", userPrincipal.getId());
            return ResponseEntity.ok(updatedUser);
        } catch (RuntimeException e) {
            logger.error("Error updating user profile: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/master-vehicle-details")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> saveMasterVehicleDetails(@RequestBody Map<String, Object> masterDetails,
                                                      Authentication authentication) {
        logger.info("Entering saveMasterVehicleDetails()");
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Saving master vehicle details for userId: {}", userPrincipal.getId());
            User updatedUser = userService.saveMasterVehicleDetails(userPrincipal.getId(), masterDetails);
            logger.info("Master vehicle details saved successfully for userId: {}", userPrincipal.getId());
            return ResponseEntity.ok(updatedUser);
        } catch (RuntimeException e) {
            logger.error("Error saving master vehicle details: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/master-vehicle-details")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> getMasterVehicleDetails(Authentication authentication) {
        logger.info("Entering getMasterVehicleDetails()");
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Fetching master vehicle details for userId: {}", userPrincipal.getId());
            Map<String, Object> masterDetails = userService.getMasterVehicleDetails(userPrincipal.getId());
            logger.info("Master vehicle details fetched successfully for userId: {}", userPrincipal.getId());
            return ResponseEntity.ok(masterDetails);
        } catch (RuntimeException e) {
            logger.error("Error fetching master vehicle details: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    private static class ErrorResponse {
        private String message;
        public ErrorResponse(String message) {
            this.message = message;
        }
        @SuppressWarnings("unused") // Used by Jackson for JSON serialization
        public String getMessage() {
            return message;
        }
    }
}
