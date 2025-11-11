package com.infosys.rsa.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

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

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        logger.error("Unexpected error: {}", ex.getMessage(), ex);
        return new ResponseEntity<>(
                new ErrorResponse(500, "Internal server error", LocalDateTime.now()),
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}
