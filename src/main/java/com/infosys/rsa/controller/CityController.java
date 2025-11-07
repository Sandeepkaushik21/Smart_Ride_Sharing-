package com.infosys.rsa.controller;

import com.infosys.rsa.service.CityService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/public")
public class CityController {

    private static final Logger logger = LoggerFactory.getLogger(CityController.class);

    @Autowired
    CityService cityService;

    @GetMapping("/cities/suggestions")
    public ResponseEntity<?> getCitySuggestions(@RequestParam(required = false) String query) {
        logger.info("Entering getCitySuggestions() with query: {}", query);
        try {
            List<String> suggestions = cityService.getCitySuggestions(query);
            logger.info("City suggestions fetched successfully. Query: '{}', Count: {}", query, suggestions.size());
            return ResponseEntity.ok(suggestions);
        } catch (RuntimeException e) {
            logger.error("Error fetching city suggestions for query '{}': {}", query, e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Failed to fetch city suggestions");
        }
    }
}
