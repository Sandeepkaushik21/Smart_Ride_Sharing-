package com.infosys.rsa.service;

import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    /**
     * Fetch a user by ID
     */
    public User getUserById(Long userId) {
        logger.info("Fetching user details for userId: {}", userId);
        return userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.error("User not found with ID: {}", userId);
                    return new RuntimeException("User not found");
                });
    }

    /**
     * Update user profile with provided details
     */
    public User updateUserProfile(Long userId, User userDetails) {
        logger.info("Updating profile for userId: {}", userId);

        User user = getUserById(userId);

        if (userDetails.getName() != null) {
            logger.debug("Updating name for userId: {} from '{}' to '{}'", userId, user.getName(), userDetails.getName());
            user.setName(userDetails.getName());
        }
        if (userDetails.getPhone() != null) {
            logger.debug("Updating phone for userId: {} to '{}'", userId, userDetails.getPhone());
            user.setPhone(userDetails.getPhone());
        }
        if (userDetails.getVehicleModel() != null) {
            logger.debug("Updating vehicle model for userId: {} to '{}'", userId, userDetails.getVehicleModel());
            user.setVehicleModel(userDetails.getVehicleModel());
        }
        if (userDetails.getLicensePlate() != null) {
            logger.debug("Updating license plate for userId: {} to '{}'", userId, userDetails.getLicensePlate());
            user.setLicensePlate(userDetails.getLicensePlate());
        }
        if (userDetails.getVehicleCapacity() != null) {
            logger.debug("Updating vehicle capacity for userId: {} to '{}'", userId, userDetails.getVehicleCapacity());
            user.setVehicleCapacity(userDetails.getVehicleCapacity());
        }

        User updatedUser = userRepository.save(user);
        logger.info("Profile updated successfully for userId: {}", userId);

        return updatedUser;
    }

    /**
     * Get all users
     */
    public List<User> getAllUsers() {
        logger.info("Fetching all users from the database");
        List<User> users = userRepository.findAll();
        logger.debug("Total users found: {}", users.size());
        return users;
    }

    /**
     * Get list of pending drivers (approval not yet reviewed)
     */
    public List<User> getPendingDrivers() {
        logger.info("Fetching all pending drivers for admin review");
        List<User> pendingDrivers = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_DRIVER")))
                .filter(user -> user.getIsApproved() == null)
                .toList();

        logger.debug("Pending drivers found: {}", pendingDrivers.size());
        return pendingDrivers;
    }
}
