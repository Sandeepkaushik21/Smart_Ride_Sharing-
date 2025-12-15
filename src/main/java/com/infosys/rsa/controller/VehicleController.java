package com.infosys.rsa.controller;

import com.infosys.rsa.model.User;
import com.infosys.rsa.model.Vehicle;
import com.infosys.rsa.repository.UserRepository;
import com.infosys.rsa.repository.VehicleRepository;
import com.infosys.rsa.security.UserDetailsServiceImpl.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private static final Logger logger = LoggerFactory.getLogger(VehicleController.class);

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/my")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> getMyVehicles(Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        logger.info("Fetching vehicles for driver {}", principal.getId());
        List<Vehicle> vehicles = vehicleRepository.findByDriverId(principal.getId());
        return ResponseEntity.ok(vehicles);
    }

    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> createVehicle(@RequestBody Map<String, Object> payload,
                                           Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        logger.info("Creating vehicle for driver {}", principal.getId());
        User driver = userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        Vehicle vehicle = new Vehicle();
        vehicle.setDriver(driver);
        applyPayloadToVehicle(vehicle, payload);
        Vehicle saved = vehicleRepository.save(vehicle);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> updateVehicle(@PathVariable Long id,
                                           @RequestBody Map<String, Object> payload,
                                           Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        logger.info("Updating vehicle {} for driver {}", id, principal.getId());

        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        if (!vehicle.getDriver().getId().equals(principal.getId())) {
            return ResponseEntity.status(403).body(error("You can only update your own vehicles"));
        }

        applyPayloadToVehicle(vehicle, payload);
        Vehicle saved = vehicleRepository.save(vehicle);
        return ResponseEntity.ok(saved);
    }

    private void applyPayloadToVehicle(Vehicle vehicle, Map<String, Object> payload) {
        if (payload == null) {
            return;
        }
        Object vehicleType = payload.get("vehicleType");
        if (vehicleType instanceof String) {
            vehicle.setVehicleType((String) vehicleType);
        }
        Object vehicleModel = payload.get("vehicleModel");
        if (vehicleModel instanceof String) {
            vehicle.setVehicleModel((String) vehicleModel);
        }
        Object vehicleColor = payload.get("vehicleColor");
        if (vehicleColor instanceof String) {
            vehicle.setVehicleColor((String) vehicleColor);
        }
        Object licensePlate = payload.get("licensePlate");
        if (licensePlate instanceof String) {
            vehicle.setLicensePlate((String) licensePlate);
        }
        Object capacity = payload.get("capacity");
        if (capacity instanceof Number) {
            vehicle.setCapacity(((Number) capacity).intValue());
        }
        Object hasAC = payload.get("hasAC");
        if (hasAC instanceof Boolean) {
            vehicle.setHasAC((Boolean) hasAC);
        }
        Object photosJson = payload.get("photosJson");
        if (photosJson instanceof String) {
            vehicle.setPhotosJson((String) photosJson);
        }

        Object licenseNumber = payload.get("licenseNumber");
        if (licenseNumber instanceof String) {
            vehicle.setLicenseNumber((String) licenseNumber);
        }
        Object licenseValidTill = payload.get("licenseValidTill");
        if (licenseValidTill instanceof String && !((String) licenseValidTill).isBlank()) {
            vehicle.setLicenseValidTill(LocalDate.parse((String) licenseValidTill));
        }

        Object rcNumber = payload.get("rcNumber");
        if (rcNumber instanceof String) {
            vehicle.setRcNumber((String) rcNumber);
        }
        Object rcValidTill = payload.get("rcValidTill");
        if (rcValidTill instanceof String && !((String) rcValidTill).isBlank()) {
            vehicle.setRcValidTill(LocalDate.parse((String) rcValidTill));
        }

        Object pollutionNumber = payload.get("pollutionNumber");
        if (pollutionNumber instanceof String) {
            vehicle.setPollutionNumber((String) pollutionNumber);
        }
        Object pollutionValidTill = payload.get("pollutionValidTill");
        if (pollutionValidTill instanceof String && !((String) pollutionValidTill).isBlank()) {
            vehicle.setPollutionValidTill(LocalDate.parse((String) pollutionValidTill));
        }
    }

    private Map<String, String> error(String message) {
        Map<String, String> err = new HashMap<>();
        err.put("message", message);
        return err;
    }
}





