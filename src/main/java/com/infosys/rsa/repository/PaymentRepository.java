package com.infosys.rsa.repository;

import com.infosys.rsa.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByPassengerIdOrderByCreatedAtDesc(Long passengerId);
    
    List<Payment> findByDriverIdOrderByCreatedAtDesc(Long driverId);
    
    List<Payment> findByBookingId(Long bookingId);
    
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    
    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);
    
    @Query("SELECT p FROM Payment p WHERE p.driver.id = :driverId AND p.driverPaymentStatus = :status ORDER BY p.createdAt DESC")
    List<Payment> findByDriverIdAndDriverPaymentStatus(@Param("driverId") Long driverId, @Param("status") Payment.DriverPaymentStatus status);
    
    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.driver.id = :driverId AND p.driverPaymentStatus = 'COMPLETED'")
    Double getTotalEarningsByDriverId(@Param("driverId") Long driverId);
    
    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.driver.id = :driverId AND p.driverPaymentStatus = 'PENDING'")
    Double getPendingEarningsByDriverId(@Param("driverId") Long driverId);
}

