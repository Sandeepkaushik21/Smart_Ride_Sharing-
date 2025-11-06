package com.infosys.rsa.repository;

import com.infosys.rsa.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByReviewedId(Long driverId);
    
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.reviewed.id = :driverId")
    Double findAverageRatingByDriverId(@Param("driverId") Long driverId);
    
    @Query("SELECT r FROM Review r WHERE r.booking.id = :bookingId")
    List<Review> findByBookingId(@Param("bookingId") Long bookingId);
    
    @Query("SELECT r FROM Review r WHERE r.reviewer.id = :reviewerId")
    List<Review> findByReviewerId(@Param("reviewerId") Long reviewerId);
    
    @Query("SELECT r FROM Review r WHERE r.reviewed.id = :reviewedId")
    List<Review> findAllByReviewedId(@Param("reviewedId") Long reviewedId);
}

