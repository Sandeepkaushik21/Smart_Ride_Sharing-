package com.infosys.rsa.service;

import com.infosys.rsa.dto.ReviewRequest;
import com.infosys.rsa.model.Booking;
import com.infosys.rsa.model.Review;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.BookingRepository;
import com.infosys.rsa.repository.ReviewRepository;
import com.infosys.rsa.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReviewService {

    private static final Logger logger = LoggerFactory.getLogger(ReviewService.class);

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public Review submitReview(Long passengerId, ReviewRequest request) {
        logger.info("Passenger ID: {} submitting review for booking ID: {}", passengerId, request.getBookingId());

        // Find booking
        Booking booking = bookingRepository.findByIdWithRide(request.getBookingId())
                .orElseThrow(() -> {
                    logger.error("Booking not found with ID: {}", request.getBookingId());
                    return new RuntimeException("Booking not found");
                });

        // Verify booking belongs to passenger
        if (!booking.getPassenger().getId().equals(passengerId)) {
            logger.error("Unauthorized review submission attempt by passenger ID: {}", passengerId);
            throw new RuntimeException("You can only review your own bookings");
        }

        // Verify booking is completed or confirmed with date passed
        boolean isCompleted = booking.getStatus() == Booking.BookingStatus.COMPLETED;
        boolean isConfirmedWithDatePassed = booking.getStatus() == Booking.BookingStatus.CONFIRMED 
                && booking.getRide() != null 
                && booking.getRide().getDate() != null
                && booking.getRide().getDate().isBefore(java.time.LocalDate.now());
        
        if (!isCompleted && !isConfirmedWithDatePassed) {
            logger.error("Booking ID: {} is not completed. Current status: {}", request.getBookingId(), booking.getStatus());
            throw new RuntimeException("You can only review completed rides or rides with passed dates");
        }

        // Check if review already exists for this booking
        List<Review> existingReviews = reviewRepository.findByBookingId(request.getBookingId());
        if (!existingReviews.isEmpty()) {
            logger.error("Review already exists for booking ID: {}", request.getBookingId());
            throw new RuntimeException("You have already reviewed this ride");
        }

        // Get driver from booking
        User driver = booking.getRide().getDriver();
        User passenger = booking.getPassenger();

        // Create review
        Review review = new Review();
        review.setBooking(booking);
        review.setReviewer(passenger);
        review.setReviewed(driver);
        review.setRating(request.getRating());
        review.setComment(request.getComment());

        Review savedReview = reviewRepository.save(review);
        logger.info("Review saved successfully with ID: {}", savedReview.getId());

        // Update driver's average rating
        updateDriverRating(driver.getId());

        return savedReview;
    }

    @Transactional
    public void updateDriverRating(Long driverId) {
        logger.info("Updating driver rating for driver ID: {}", driverId);

        Double averageRating = reviewRepository.findAverageRatingByDriverId(driverId);
        
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> {
                    logger.error("Driver not found with ID: {}", driverId);
                    return new RuntimeException("Driver not found");
                });

        if (averageRating != null) {
            driver.setDriverRating(averageRating);
            userRepository.save(driver);
            logger.info("Driver rating updated to: {} for driver ID: {}", averageRating, driverId);
        } else {
            driver.setDriverRating(0.0);
            userRepository.save(driver);
            logger.info("No reviews found, driver rating set to 0.0 for driver ID: {}", driverId);
        }
    }

    public Double getAverageRating(Long driverId) {
        Double rating = reviewRepository.findAverageRatingByDriverId(driverId);
        return rating != null ? rating : 0.0;
    }

    public boolean hasReviewed(Long bookingId) {
        List<Review> reviews = reviewRepository.findByBookingId(bookingId);
        return !reviews.isEmpty();
    }

    public List<Review> getReviewsByDriver(Long driverId) {
        return reviewRepository.findAllByReviewedId(driverId);
    }
}

