package com.infosys.rsa.repository;

import com.infosys.rsa.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    @Query("SELECT b FROM Booking b LEFT JOIN FETCH b.ride LEFT JOIN FETCH b.passenger WHERE b.passenger.id = :passengerId ORDER BY b.createdAt DESC")
    List<Booking> findByPassengerId(@Param("passengerId") Long passengerId);
    
    @Query("SELECT b FROM Booking b LEFT JOIN FETCH b.ride LEFT JOIN FETCH b.passenger WHERE b.ride.id = :rideId")
    List<Booking> findByRideId(@Param("rideId") Long rideId);
    
    @Query("SELECT b FROM Booking b LEFT JOIN FETCH b.ride LEFT JOIN FETCH b.passenger WHERE b.ride.driver.id = :driverId ORDER BY b.createdAt DESC")
    List<Booking> findByRideDriverId(@Param("driverId") Long driverId);
    
    @Query("SELECT b FROM Booking b LEFT JOIN FETCH b.ride LEFT JOIN FETCH b.passenger WHERE b.id = :id")
    java.util.Optional<Booking> findByIdWithRide(@Param("id") Long id);
}

