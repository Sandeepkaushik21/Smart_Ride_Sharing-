package com.infosys.rsa.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class RideRescheduleRequest {
    @NotNull(message = "New date is required")
    private LocalDate newDate;

    @NotNull(message = "New time is required")
    private LocalTime newTime;

    private String reason; // Optional reason for rescheduling
}

