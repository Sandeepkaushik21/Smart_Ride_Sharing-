package com.infosys.rsa.controller;

import com.infosys.rsa.dto.*;
import com.infosys.rsa.security.UserDetailsServiceImpl.UserPrincipal;
import com.infosys.rsa.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        logger.info("Entering register() with email: {}", request.getEmail());
        try {
            JwtResponse response = authService.register(request);
            logger.info("User registered successfully with email: {}", request.getEmail());
            return ResponseEntity.ok(response);
        } catch (com.infosys.rsa.exception.EmailAlreadyTakenException e) {
            logger.warn("Registration attempt with existing email: {}", request.getEmail());
            return ResponseEntity.status(409).body(new ErrorResponse("This email is already registered. Please login instead."));
        } catch (com.infosys.rsa.exception.PhoneAlreadyTakenException e) {
            logger.warn("Registration attempt with existing phone: {}", request.getPhone());
            return ResponseEntity.status(409).body(new ErrorResponse("This phone number is already registered. Please login instead."));
        } catch (RuntimeException e) {
            logger.error("Error during user registration for email {}: {}", request.getEmail(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        logger.info("Entering login() for email: {}", request.getEmail());
        try {
            JwtResponse response = authService.login(request);
            logger.info("User login successful for email: {}", request.getEmail());
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException e) {
            logger.warn("Login failed for email {}: {}", request.getEmail(), e.getMessage());
            // Check if user exists to provide better error message
            if (e.getMessage() != null && (e.getMessage().contains("Invalid email or password") || 
                e.getMessage().contains("Account is inactive"))) {
                return ResponseEntity.status(401).body(new ErrorResponse(e.getMessage()));
            }
            return ResponseEntity.status(401).body(new ErrorResponse("Invalid email or password. Please check your credentials or register if you don't have an account."));
        } catch (Exception e) {
            logger.error("Login failed for email {}: {}", request.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(401).body(new ErrorResponse("Invalid email or password. Please check your credentials or register if you don't have an account."));
        }
    }

    @PostMapping("/change-password")
    @PreAuthorize("hasAnyRole('PASSENGER', 'DRIVER', 'ADMIN')")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                            Authentication authentication) {
        logger.info("Entering changePassword() method");
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.debug("Authenticated user ID: {}", userPrincipal.getId());
            authService.changePassword(userPrincipal.getId(), request);
            logger.info("Password changed successfully for user ID: {}", userPrincipal.getId());
            return ResponseEntity.ok(new MessageResponse("Password changed successfully"));
        } catch (RuntimeException e) {
            logger.error("Error changing password: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        logger.info("Entering forgotPassword() for email: {}", request.getEmail());
        try {
            authService.forgotPassword(request);
            logger.info("Forgot password request processed successfully for email: {}", request.getEmail());
            return ResponseEntity.ok(new MessageResponse("If the email exists, a temporary password has been sent."));
        } catch (RuntimeException e) {
            logger.error("Error processing forgot password for email {}: {}", request.getEmail(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        logger.info("Entering resetPassword() for email: {}", request.getEmail());
        try {
            authService.resetPassword(request);
            logger.info("Password reset successfully for email: {}", request.getEmail());
            return ResponseEntity.ok(new MessageResponse("Password reset successfully"));
        } catch (RuntimeException e) {
            logger.error("Error resetting password for email {}: {}", request.getEmail(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        logger.info("Entering googleLogin()");
        try {
            JwtResponse response = authService.loginWithGoogle(request);
            logger.info("Google login successful");
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException e) {
            logger.error("Google login failed - BadCredentials: {}", e.getMessage(), e);
            return ResponseEntity.status(401).body(new ErrorResponse(e.getMessage()));
        } catch (RuntimeException e) {
            logger.error("Google login failed - RuntimeException: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new ErrorResponse("Google authentication failed: " + e.getMessage()));
        } catch (Exception e) {
            logger.error("Google login failed - Exception: {} | Type: {} | Cause: {}", 
                e.getMessage(), 
                e.getClass().getName(),
                e.getCause() != null ? e.getCause().getMessage() : "none", 
                e);
            // Return a more specific error message instead of throwing
            String errorMessage = "Google authentication failed. Please try again.";
            if (e.getMessage() != null) {
                if (e.getMessage().contains("Invalid Google token") || e.getMessage().contains("token")) {
                    errorMessage = "Invalid Google token. Please try signing in again.";
                } else if (e.getMessage().contains("not properly configured")) {
                    errorMessage = "Google OAuth is not properly configured. Please contact administrator.";
                } else {
                    errorMessage = "Google authentication failed: " + e.getMessage();
                }
            }
            return ResponseEntity.status(500).body(new ErrorResponse(errorMessage));
        }
    }

    // Inner classes for responses
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

    private static class MessageResponse {
        private String message;

        public MessageResponse(String message) {
            this.message = message;
        }

        @SuppressWarnings("unused") // Used by Jackson for JSON serialization
        public String getMessage() {
            return message;
        }
    }
}
