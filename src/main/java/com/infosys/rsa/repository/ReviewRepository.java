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
}

