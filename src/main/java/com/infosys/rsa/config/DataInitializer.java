package com.infosys.rsa.config;

import com.infosys.rsa.model.Role;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.RoleRepository;
import com.infosys.rsa.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {
    @Autowired
    RoleRepository roleRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Create roles if they don't exist
        if (roleRepository.count() == 0) {
            Role adminRole = new Role();
            adminRole.setName(Role.ERole.ROLE_ADMIN);
            roleRepository.save(adminRole);

            Role driverRole = new Role();
            driverRole.setName(Role.ERole.ROLE_DRIVER);
            roleRepository.save(driverRole);

            Role passengerRole = new Role();
            passengerRole.setName(Role.ERole.ROLE_PASSENGER);
            roleRepository.save(passengerRole);

            System.out.println("Default roles created successfully!");
        }

        // Create default admin user if it doesn't exist
        String adminEmail = "admin@rideshare.com";
        if (!userRepository.existsByEmail(adminEmail)) {
            User adminUser = new User();
            adminUser.setEmail(adminEmail);
            adminUser.setName("Administrator");
            adminUser.setPassword(passwordEncoder.encode("adminpass"));
            adminUser.setIsActive(true);
            adminUser.setIsApproved(true); // Admin is auto-approved
            adminUser.setIsFirstLogin(false); // No temp password for admin

            // Set ADMIN role
            Role adminRole = roleRepository.findByName(Role.ERole.ROLE_ADMIN)
                    .orElseThrow(() -> new RuntimeException("Admin role not found!"));
            Set<Role> roles = new HashSet<>();
            roles.add(adminRole);
            adminUser.setRoles(roles);

            userRepository.save(adminUser);
            System.out.println("Default admin user initialized successfully!");
        } else {
            System.out.println("Admin user already exists.");
        }
    }
}

