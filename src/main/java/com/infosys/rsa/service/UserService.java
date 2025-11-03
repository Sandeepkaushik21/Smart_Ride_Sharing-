package com.infosys.rsa.service;

import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {
    @Autowired
    UserRepository userRepository;

    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User updateUserProfile(Long userId, User userDetails) {
        User user = getUserById(userId);
        
        if (userDetails.getName() != null) {
            user.setName(userDetails.getName());
        }
        if (userDetails.getPhone() != null) {
            user.setPhone(userDetails.getPhone());
        }
        if (userDetails.getVehicleModel() != null) {
            user.setVehicleModel(userDetails.getVehicleModel());
        }
        if (userDetails.getLicensePlate() != null) {
            user.setLicensePlate(userDetails.getLicensePlate());
        }
        if (userDetails.getVehicleCapacity() != null) {
            user.setVehicleCapacity(userDetails.getVehicleCapacity());
        }

        return userRepository.save(user);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<User> getPendingDrivers() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().name().equals("ROLE_DRIVER")))
                .filter(user -> user.getIsApproved() == null) // Only drivers not yet reviewed
                .toList();
    }
}

