package com.infosys.rsa.repository;

import com.infosys.rsa.model.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long> {
    
    @Query("SELECT r FROM Ride r LEFT JOIN FETCH r.driver WHERE r.driver.id = :driverId AND r.status <> 'CANCELLED' ORDER BY r.date DESC, r.time DESC")
    List<Ride> findByDriverId(@Param("driverId") Long driverId);
    
    // Search by city-level route (not specific locations)
    @Query("SELECT DISTINCT r FROM Ride r LEFT JOIN FETCH r.driver WHERE r.citySource LIKE %:source% AND r.cityDestination LIKE %:destination% AND r.date = :date AND r.status = 'SCHEDULED' AND r.availableSeats > 0")
    List<Ride> searchRides(@Param("source") String source, @Param("destination") String destination, @Param("date") LocalDate date);
    
    @Query("SELECT DISTINCT r.source FROM Ride r WHERE r.source LIKE %:query%")
    List<String> findDistinctSourcesContaining(@Param("query") String query);
    
    @Query("SELECT DISTINCT r.destination FROM Ride r WHERE r.destination LIKE %:query%")
    List<String> findDistinctDestinationsContaining(@Param("query") String query);
}
