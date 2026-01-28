package com.infosys.rsa.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(RideNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleRideNotFound(RideNotFoundException ex) {
        logger.error("Ride not found: {}", ex.getMessage());
        return new ResponseEntity<>(
                new ErrorResponse(404, ex.getMessage(), LocalDateTime.now()),
                HttpStatus.NOT_FOUND
        );
    }

    @ExceptionHandler(PassengerNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePassengerNotFound(PassengerNotFoundException ex) {
        logger.error("Passenger not found: {}", ex.getMessage());
        return new ResponseEntity<>(
                new ErrorResponse(404, ex.getMessage(), LocalDateTime.now()),
                HttpStatus.NOT_FOUND
        );
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        logger.error("User not found: {}", ex.getMessage());
        return new ResponseEntity<>(
                new ErrorResponse(404, ex.getMessage(), LocalDateTime.now()),
                HttpStatus.NOT_FOUND
        );
    }

    @ExceptionHandler(InsufficientSeatsException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientSeats(InsufficientSeatsException ex) {
        logger.error("Insufficient seats: {}", ex.getMessage());
        return new ResponseEntity<>(
                new ErrorResponse(400, ex.getMessage(), LocalDateTime.now()),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(InvalidLocationException.class)
    public ResponseEntity<ErrorResponse> handleInvalidLocation(InvalidLocationException ex) {
        logger.error("Invalid location: {}", ex.getMessage());
        return new ResponseEntity<>(
                new ErrorResponse(400, ex.getMessage(), LocalDateTime.now()),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(DuplicateBookingException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateBooking(DuplicateBookingException ex) {
        logger.error("Duplicate booking: {}", ex.getMessage());
        return new ResponseEntity<>(
                new ErrorResponse(409, ex.getMessage(), LocalDateTime.now()),
                HttpStatus.CONFLICT
        );
    }

    @ExceptionHandler(EmailAlreadyTakenException.class)
    public ResponseEntity<ErrorResponse> handleEmailAlreadyTaken(EmailAlreadyTakenException ex) {
        logger.error("Email already taken: {}", ex.getMessage());
        return new ResponseEntity<>(
                new ErrorResponse(409, ex.getMessage(), LocalDateTime.now()),
                HttpStatus.CONFLICT
        );
    }

    @ExceptionHandler(PhoneAlreadyTakenException.class)
    public ResponseEntity<ErrorResponse> handlePhoneAlreadyTaken(PhoneAlreadyTakenException ex) {
        logger.error("Phone already taken: {}", ex.getMessage());
        return new ResponseEntity<>(
                new ErrorResponse(409, ex.getMessage(), LocalDateTime.now()),
                HttpStatus.CONFLICT
        );
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        logger.error("Authentication failed: {}", ex.getMessage());
        return new ResponseEntity<>(
                new ErrorResponse(401, "Invalid email or password", LocalDateTime.now()),
                HttpStatus.UNAUTHORIZED
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        String message = errors.entrySet().stream()
                .map(entry -> entry.getKey() + ": " + entry.getValue())
                .collect(Collectors.joining(", "));
        
        logger.error("Validation error: {}", message);
        return new ResponseEntity<>(
                new ErrorResponse(400, "Validation failed: " + message, LocalDateTime.now()),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.joining(", "));
        
        logger.error("Constraint violation: {}", message);
        return new ResponseEntity<>(
                new ErrorResponse(400, "Validation failed: " + message, LocalDateTime.now()),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        logger.error("Malformed JSON request: {}", ex.getMessage());
        
        // Extract meaningful error message
        String message = "Invalid JSON format";
        if (ex.getMessage() != null && ex.getMessage().contains("JSON parse error")) {
            message = "Invalid JSON format. Please check your request body.";
        }
        
        return new ResponseEntity<>(
                new ErrorResponse(400, message, LocalDateTime.now()),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        logger.error("Invalid argument: {}", ex.getMessage());
        return new ResponseEntity<>(
                new ErrorResponse(400, ex.getMessage(), LocalDateTime.now()),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex) {
        logger.error("Runtime error: {}", ex.getMessage(), ex);
        // Return the actual error message for better debugging
        return new ResponseEntity<>(
                new ErrorResponse(400, ex.getMessage(), LocalDateTime.now()),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        logger.error("Unexpected error: {}", ex.getMessage(), ex);
        logger.error("Stack trace: ", ex);
        
        // Provide more helpful error messages for common issues
        String message = "Internal server error. Please contact support.";
        if (ex.getMessage() != null) {
            if (ex.getMessage().contains("Google") || ex.getMessage().contains("OAuth")) {
                message = "Google authentication failed. Please try again or contact support.";
            } else if (ex.getMessage().contains("token")) {
                message = "Authentication token error. Please try logging in again.";
            } else if (ex.getMessage().contains("database") || ex.getMessage().contains("SQL")) {
                message = "Database error. Please contact support.";
            }
        }
        
        return new ResponseEntity<>(
                new ErrorResponse(500, message, LocalDateTime.now()),
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}
