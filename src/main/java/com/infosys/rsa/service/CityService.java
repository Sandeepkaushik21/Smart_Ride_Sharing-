package com.infosys.rsa.service;

import com.infosys.rsa.repository.RideRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CityService {

    private static final Logger logger = LoggerFactory.getLogger(CityService.class);

    @Autowired
    RideRepository rideRepository;

    // Common Indian cities for autocomplete
    private static final List<String> COMMON_CITIES = List.of(
            "Chennai", "Mumbai", "Delhi", "Bangalore", "Kolkata", "Hyderabad",
            "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur",
            "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna",
            "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad",
            "Meerut", "Rajkot", "Varanasi", "Srinagar", "Amritsar", "Allahabad",
            "Howrah", "Ranchi", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur",
            "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur", "Hubli",
            "Tiruchirappalli", "Mysore", "Bareilly", "Aligarh", "Moradabad",
            "Durgapur", "Rourkela", "Bhilai", "Kochi", "Coimbatore", "Madurai"
    );

    public List<String> getCitySuggestions(String query) {
        logger.info("Fetching city suggestions for query: '{}'", query);

        if (query == null || query.trim().isEmpty()) {
            logger.debug("Query is empty or null. Returning top 20 common cities.");
            return COMMON_CITIES.stream().limit(20).collect(Collectors.toList());
        }

        String lowerQuery = query.toLowerCase().trim();
        List<String> suggestions = new ArrayList<>();

        // Fetch cities from database only if query length >= 2
        List<String> dbCities = new ArrayList<>();
        if (query.length() >= 2) {
            logger.debug("Searching database for city names containing '{}'", query);
            try {
                dbCities.addAll(rideRepository.findDistinctSourcesContaining(query));
                dbCities.addAll(rideRepository.findDistinctDestinationsContaining(query));
                logger.debug("Found {} matching cities in database", dbCities.size());
            } catch (Exception e) {
                logger.error("Error fetching city data from database for query '{}': {}", query, e.getMessage());
            }
        } else {
            logger.debug("Query too short (length < 2). Skipping database lookup.");
        }

        // Search in predefined common cities (starts with)
        for (String city : COMMON_CITIES) {
            if (city.toLowerCase().startsWith(lowerQuery)) {
                if (!suggestions.contains(city) && !dbCities.contains(city)) {
                    suggestions.add(city);
                }
            }
        }

        // Add cities found in database
        for (String city : dbCities) {
            if (!suggestions.contains(city)) {
                suggestions.add(city);
            }
        }

        // If suggestions still not enough, look for partial matches
        if (suggestions.size() < 10) {
            logger.debug("Less than 10 suggestions found, performing partial matches for query '{}'", query);
            for (String city : COMMON_CITIES) {
                if (city.toLowerCase().contains(lowerQuery) && !suggestions.contains(city)) {
                    suggestions.add(city);
                    if (suggestions.size() >= 20) break;
                }
            }
        }

        List<String> finalSuggestions = suggestions.stream().limit(20).collect(Collectors.toList());
        logger.info("Returning {} city suggestions for query '{}'", finalSuggestions.size(), query);

        return finalSuggestions;
    }
}
