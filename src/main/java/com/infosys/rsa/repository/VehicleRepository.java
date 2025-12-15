package com.infosys.rsa.repository;

import com.infosys.rsa.model.Vehicle;
import com.infosys.rsa.model.Vehicle.VehicleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findByDriverId(Long driverId);

    List<Vehicle> findByDriverIdAndStatus(Long driverId, VehicleStatus status);
}





