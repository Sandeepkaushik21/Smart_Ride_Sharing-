package com.infosys.rsa.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class FareCalculationService {

    private static final Logger logger = LoggerFactory.getLogger(FareCalculationService.class);

    private static final double BASE_FARE = 50.0;
    private static final double RATE_PER_KM = 5.0;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.locationiq.key:}")
    private String locationIqKey;

    @Value("${app.locationiq.base:https://us1.locationiq.com/v1}")
    private String locationIqBase;

    public double calculateFare(double distanceInKm) {
        logger.debug("Calculating fare for distance: {} km", distanceInKm);
        if (distanceInKm <= 0) {
            logger.info("Distance <= 0, returning base fare: {}", BASE_FARE);
            return BASE_FARE;
        }
        double fare = BASE_FARE + (RATE_PER_KM * distanceInKm);
        logger.info("Calculated fare: {} for distance: {} km", fare, distanceInKm);
        return fare;
    }

    public double calculateDistance(String source, String destination) {
        logger.info("Calculating distance between '{}' and '{}'", source, destination);

        if (locationIqKey == null || locationIqKey.trim().isEmpty()) {
            logger.warn("LocationIQ API key not configured, using fallback distance method.");
            return calculateDistanceFallback(source, destination);
        }

        try {
            double[] srcLatLon = geocodePlace(source);
            double[] destLatLon = geocodePlace(destination);

            if (srcLatLon == null || destLatLon == null) {
                logger.warn("Failed to geocode source or destination, using fallback method.");
                return calculateDistanceFallback(source, destination);
            }

            double srcLat = srcLatLon[0];
            double srcLon = srcLatLon[1];
            double destLat = destLatLon[0];
            double destLon = destLatLon[1];

            String coordinates = String.format("%s,%s|%s,%s", srcLon, srcLat, destLon, destLat);
            String url = String.format("%s/directions/driving?key=%s&coordinates=%s", locationIqBase, locationIqKey, coordinates);
            logger.debug("Calling LocationIQ Directions API: {}", url);

            try {
                ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
                if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                    JsonNode root = objectMapper.readTree(resp.getBody());
                    if (root.has("routes") && root.path("routes").isArray() && root.path("routes").size() > 0) {
                        double meters = root.path("routes").get(0).path("distance").asDouble(0.0);
                        double km = meters / 1000.0;
                        logger.info("Distance from LocationIQ route data: {} km", km);
                        return Math.max(km, 0.0);
                    }

                    if (root.has("distance")) {
                        double meters = root.path("distance").asDouble(0.0);
                        double km = meters / 1000.0;
                        logger.info("Distance from LocationIQ (fallback distance field): {} km", km);
                        return Math.max(km, 0.0);
                    }

                    logger.warn("LocationIQ response did not contain valid distance data, using haversine fallback.");
                    return haversineDistanceKm(srcLat, srcLon, destLat, destLon);
                } else {
                    logger.error("LocationIQ API returned non-success response: {}", resp.getStatusCode());
                    return haversineDistanceKm(srcLat, srcLon, destLat, destLon);
                }
            } catch (Exception ex) {
                logger.error("Error calling LocationIQ Directions API: {}", ex.getMessage());
                return haversineDistanceKm(srcLat, srcLon, destLat, destLon);
            }
        } catch (Exception e) {
            logger.error("Unexpected error during distance calculation: {}. Using fallback method.", e.getMessage());
            return calculateDistanceFallback(source, destination);
        }
    }

    private double[] geocodePlace(String place) {
        if (place == null || place.trim().isEmpty()) {
            logger.warn("Cannot geocode empty or null place name.");
            return null;
        }

        try {
            String q = java.net.URLEncoder.encode(place, java.nio.charset.StandardCharsets.UTF_8);
            String url = String.format("%s/search.php?key=%s&q=%s&format=json&limit=1", locationIqBase, locationIqKey, q);
            logger.debug("Calling LocationIQ Geocoding API for '{}': {}", place, url);

            ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                logger.warn("Geocoding API failed for '{}', response: {}", place, resp.getStatusCode());
                return null;
            }

            JsonNode arr = objectMapper.readTree(resp.getBody());
            if (arr.isArray() && arr.size() > 0) {
                JsonNode first = arr.get(0);
                double lat = first.path("lat").asDouble(Double.NaN);
                double lon = first.path("lon").asDouble(Double.NaN);
                if (!Double.isNaN(lat) && !Double.isNaN(lon)) {
                    logger.debug("Geocoded '{}' to lat: {}, lon: {}", place, lat, lon);
                    return new double[]{lat, lon};
                }
            }

            logger.warn("No valid geocoding result for '{}'", place);
            return null;
        } catch (Exception e) {
            logger.error("Error geocoding '{}': {}", place, e.getMessage());
            return null;
        }
    }

    /**
     * Haversine great-circle distance (km)
     */
    private double haversineDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = R * c;
        logger.debug("Calculated haversine distance: {} km", distance);
        return Math.max(distance, 0.0);
    }

    /**
     * Fallback distance calculation using hashcodes
     */
    private double calculateDistanceFallback(String source, String destination) {
        logger.warn("Using fallback distance calculation for '{}' -> '{}'", source, destination);

        if (source == null) source = "";
        if (destination == null) destination = "";
        double baseDistance = Math.abs(source.hashCode() % 500);
        double destDistance = Math.abs(destination.hashCode() % 500);
        double distance = Math.abs(baseDistance - destDistance);

        logger.debug("Fallback computed distance: {} km", distance);
        return Math.max(distance, 0);
    }

    /**
     * Proportional fare calculation based on passenger distance
     */
    public double calculateProportionalFare(double totalFare, double totalDistance, double passengerDistance) {
        logger.debug("Calculating proportional fare: totalFare={}, totalDistance={}, passengerDistance={}",
                totalFare, totalDistance, passengerDistance);

        if (totalDistance <= 0 || passengerDistance <= 0) {
            logger.warn("Invalid total or passenger distance, returning full fare: {}", totalFare);
            return totalFare;
        }

        double proportion = passengerDistance / totalDistance;
        double proportionalFare = totalFare * proportion;
        logger.info("Calculated proportional fare: {} (proportion: {})", proportionalFare, proportion);
        return proportionalFare;
    }
}
