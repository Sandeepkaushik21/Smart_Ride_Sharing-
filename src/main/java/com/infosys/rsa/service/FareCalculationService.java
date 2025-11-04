package com.infosys.rsa.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class FareCalculationService {
    private static final double BASE_FARE = 50.0;
    private static final double RATE_PER_KM = 5.0;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.locationiq.key:}")
    private String locationIqKey;

    @Value("${app.locationiq.base:https://us1.locationiq.com/v1}")
    private String locationIqBase;

    /**
     * Calculate fare based on distance
     */
    public double calculateFare(double distanceInKm) {
        if (distanceInKm <= 0) {
            return BASE_FARE;
        }
        return BASE_FARE + (RATE_PER_KM * distanceInKm);
    }

    /**
     * Calculate distance between two places using LocationIQ Directions API.
     * Falls back to Haversine (straight-line) when directions are unavailable.
     * If LocationIQ key is not configured or geocoding fails, falls back to the
     * previous simple hash-based dummy distance (keeps minimum 0 km).
     */
    public double calculateDistance(String source, String destination) {
        // If key not provided, fallback to previous dummy behaviour (but without forced min 10 km)
        if (locationIqKey == null || locationIqKey.trim().isEmpty()) {
            return calculateDistanceFallback(source, destination);
        }

        try {
            // 1) Geocode both places to lat/lon using LocationIQ search.php
            double[] srcLatLon = geocodePlace(source);
            double[] destLatLon = geocodePlace(destination);

            if (srcLatLon == null || destLatLon == null) {
                // geocoding failed for one or both -> fallback
                return calculateDistanceFallback(source, destination);
            }

            double srcLat = srcLatLon[0];
            double srcLon = srcLatLon[1];
            double destLat = destLatLon[0];
            double destLon = destLatLon[1];

            // 2) Try Directions/Route API to get driving distance (meters)
            try {
                // LocationIQ Directions endpoint (coordinates param)
                // Example: https://us1.locationiq.com/v1/directions/driving?key=KEY&coordinates=lon1,lat1|lon2,lat2
                String coordinates = String.format("%s,%s|%s,%s", srcLon, srcLat, destLon, destLat);
                String url = String.format("%s/directions/driving?key=%s&coordinates=%s", locationIqBase, locationIqKey, coordinates);

                ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
                if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                    JsonNode root = objectMapper.readTree(resp.getBody());

                    // Try common response shapes: routes[0].distance (meters) or distance (meters)
                    if (root.has("routes") && root.path("routes").isArray() && root.path("routes").size() > 0) {
                        JsonNode r0 = root.path("routes").get(0);
                        if (r0.has("distance")) {
                            double meters = r0.path("distance").asDouble(0.0);
                            double km = meters / 1000.0;
                            return Math.max(km, 0.0);
                        }
                    }

                    if (root.has("distance")) {
                        double meters = root.path("distance").asDouble(0.0);
                        double km = meters / 1000.0;
                        return Math.max(km, 0.0);
                    }

                    // If directions did not return distance, fallback to haversine
                    return haversineDistanceKm(srcLat, srcLon, destLat, destLon);
                } else {
                    // non-200 -> fallback
                    return haversineDistanceKm(srcLat, srcLon, destLat, destLon);
                }
            } catch (Exception ex) {
                // Any error with directions -> fallback to haversine
                return haversineDistanceKm(srcLat, srcLon, destLat, destLon);
            }
        } catch (Exception e) {
            // Any unexpected error -> final fallback to old hash method
            return calculateDistanceFallback(source, destination);
        }
    }

    /**
     * Geocode a place using LocationIQ search.php endpoint. Returns {lat, lon} or null.
     */
    private double[] geocodePlace(String place) {
        if (place == null || place.trim().isEmpty()) return null;
        try {
            String q = java.net.URLEncoder.encode(place, java.nio.charset.StandardCharsets.UTF_8);
            String url = String.format("%s/search.php?key=%s&q=%s&format=json&limit=1", locationIqBase, locationIqKey, q);
            ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) return null;
            JsonNode arr = objectMapper.readTree(resp.getBody());
            if (arr.isArray() && arr.size() > 0) {
                JsonNode first = arr.get(0);
                double lat = first.path("lat").asDouble(Double.NaN);
                double lon = first.path("lon").asDouble(Double.NaN);
                if (!Double.isNaN(lat) && !Double.isNaN(lon)) {
                    return new double[]{lat, lon};
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Haversine great-circle distance (km)
     */
    private double haversineDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = R * c;
        return Math.max(distance, 0.0);
    }

    /**
     * Previous fallback distance calculation using string hashcodes (keeps behavior but removes forced 10km minimum).
     */
    private double calculateDistanceFallback(String source, String destination) {
        if (source == null) source = "";
        if (destination == null) destination = "";
        double baseDistance = Math.abs(source.hashCode() % 500);
        double destDistance = Math.abs(destination.hashCode() % 500);
        double distance = Math.abs(baseDistance - destDistance);
        // keep minimum 0 (previously minimum 10km) so that when LocationIQ is configured results are more accurate
        return Math.max(distance, 0);
    }

    /**
     * Split fare proportionally based on distance covered by passenger
     */
    public double calculateProportionalFare(double totalFare, double totalDistance, double passengerDistance) {
        if (totalDistance <= 0 || passengerDistance <= 0) {
            return totalFare;
        }
        double proportion = passengerDistance / totalDistance;
        return totalFare * proportion;
    }
}
