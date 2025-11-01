package com.infosys.rsa.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class RideSearchRequest {
    private String source;
    private String destination;
    private LocalDate date;
    private Double minPrice;
    private Double maxPrice;
    private Integer minRating;
}

