package com.infosys.rsa.controller;

import com.infosys.rsa.dto.ReviewRequest;
import com.infosys.rsa.model.Review;
import com.infosys.rsa.security.UserDetailsServiceImpl.UserPrincipal;
import com.infosys.rsa.service.ReviewService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private static final Logger logger = LoggerFactory.getLogger(ReviewController.class);

    @Autowired
    private ReviewService reviewService;

    @PostMapping("/submit")
    @PreAuthorize("hasAnyRole('PASSENGER', 'ADMIN')")
    public ResponseEntity<?> submitReview(@Valid @RequestBody ReviewRequest request,
                                          Authentication authentication) {
        logger.info("Entering submitReview() for booking ID: {}", request.getBookingId());
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Review review = reviewService.submitReview(userPrincipal.getId(), request);
            logger.info("Review submitted successfully for booking ID: {}", request.getBookingId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Review submitted successfully");
            response.put("review", review);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            logger.error("Error submitting review for booking ID {}: {}", request.getBookingId(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/booking/{bookingId}/has-reviewed")
    @PreAuthorize("hasAnyRole('PASSENGER', 'ADMIN')")
    public ResponseEntity<?> hasReviewed(@PathVariable Long bookingId) {
        logger.info("Checking if booking ID: {} has been reviewed", bookingId);
        try {
            boolean hasReviewed = reviewService.hasReviewed(bookingId);
            return ResponseEntity.ok(Map.of("hasReviewed", hasReviewed));
        } catch (Exception e) {
            logger.error("Error checking review status for booking ID {}: {}", bookingId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("message", "Error checking review status"));
        }
    }

    @GetMapping("/driver/{driverId}/average-rating")
    public ResponseEntity<?> getAverageRating(@PathVariable Long driverId) {
        logger.info("Getting average rating for driver ID: {}", driverId);
        try {
            Double averageRating = reviewService.getAverageRating(driverId);
            return ResponseEntity.ok(Map.of("averageRating", averageRating));
        } catch (Exception e) {
            logger.error("Error getting average rating for driver ID {}: {}", driverId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("message", "Error getting average rating"));
        }
    }
}

