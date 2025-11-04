package com.infosys.rsa.dto;

import com.infosys.rsa.model.Ride;
import com.infosys.rsa.model.User;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class RideResponse {
    private Long id;
    private String source;
    private String destination;
    private LocalDate date;
    private LocalTime time;
    private Integer availableSeats;
    private Integer totalSeats;
    private Double estimatedFare;
    private String vehiclePhotosJson;
    private Boolean hasAC;
    private String vehicleType;
    private String vehicleModel;
    private String vehicleColor;
    private String otherFeatures;

    private DriverInfo driver;

    @Data
    public static class DriverInfo {
        private Long id;
        private String name;
        private Double driverRating;

        public DriverInfo() {}

        public DriverInfo(User user) {
            if (user != null) {
                this.id = user.getId();
                // Prefer explicit name, fall back to email if name is empty
                this.name = (user.getName() != null && !user.getName().trim().isEmpty()) ? user.getName() : user.getEmail();
                this.driverRating = user.getDriverRating();
            }
        }
    }

    public RideResponse() {}

    public RideResponse(Ride r) {
        if (r == null) return;
        this.id = r.getId();
        this.source = r.getSource();
        this.destination = r.getDestination();
        this.date = r.getDate();
        this.time = r.getTime();
        this.availableSeats = r.getAvailableSeats();
        this.totalSeats = r.getTotalSeats();
        this.estimatedFare = r.getEstimatedFare();
        this.vehiclePhotosJson = r.getVehiclePhotosJson();
        this.hasAC = r.getHasAC();
        this.vehicleType = r.getVehicleType();
        this.vehicleModel = r.getVehicleModel();
        this.vehicleColor = r.getVehicleColor();
        this.otherFeatures = r.getOtherFeatures();

        User u = r.getDriver();
        if (u != null) {
            this.driver = new DriverInfo(u);
        } else {
            this.driver = new DriverInfo();
        }
    }
}
