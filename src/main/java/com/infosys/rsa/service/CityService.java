package com.infosys.rsa.service;

import com.infosys.rsa.repository.RideRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CityService {
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
        if (query == null || query.trim().isEmpty()) {
            return COMMON_CITIES.stream().limit(20).collect(Collectors.toList());
        }

        String lowerQuery = query.toLowerCase().trim();
        List<String> suggestions = new ArrayList<>();

        // First, search in database (rides)
        List<String> dbCities = new ArrayList<>();
        if (query.length() >= 2) {
            dbCities.addAll(rideRepository.findDistinctSourcesContaining(query));
            dbCities.addAll(rideRepository.findDistinctDestinationsContaining(query));
        }

        // Then, search in common cities
        for (String city : COMMON_CITIES) {
            if (city.toLowerCase().startsWith(lowerQuery)) {
                if (!suggestions.contains(city) && !dbCities.contains(city)) {
                    suggestions.add(city);
                }
            }
        }

        // Add database cities
        for (String city : dbCities) {
            if (!suggestions.contains(city)) {
                suggestions.add(city);
            }
        }

        // If still not enough, do partial matches
        if (suggestions.size() < 10) {
            for (String city : COMMON_CITIES) {
                if (city.toLowerCase().contains(lowerQuery) && !suggestions.contains(city)) {
                    suggestions.add(city);
                    if (suggestions.size() >= 20) break;
                }
            }
        }

        return suggestions.stream().limit(20).collect(Collectors.toList());
    }
}

