package com.infosys.rsa.config;

import com.infosys.rsa.model.Role;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.RoleRepository;
import com.infosys.rsa.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        logger.info("Running DataInitializer...");

        try {
            if (roleRepository.count() == 0) {
                logger.info("No roles found in database. Creating default roles...");

                Role adminRole = new Role();
                adminRole.setName(Role.ERole.ROLE_ADMIN);
                roleRepository.save(adminRole);

                Role driverRole = new Role();
                driverRole.setName(Role.ERole.ROLE_DRIVER);
                roleRepository.save(driverRole);

                Role passengerRole = new Role();
                passengerRole.setName(Role.ERole.ROLE_PASSENGER);
                roleRepository.save(passengerRole);

                logger.info("Default roles created successfully: ADMIN, DRIVER, PASSENGER");
            } else {
                logger.info("Roles already exist. Skipping role creation.");
            }

            // Create default admin user if it doesn't exist
            String adminEmail = "admin@rideshare.com";
            if (!userRepository.existsByEmail(adminEmail)) {
                logger.info("No admin user found. Creating default admin with email: {}", adminEmail);

                User adminUser = new User();
                adminUser.setEmail(adminEmail);
                adminUser.setName("Administrator");
                adminUser.setPassword(passwordEncoder.encode("adminpass"));
                adminUser.setIsActive(true);
                adminUser.setIsApproved(true);
                adminUser.setIsFirstLogin(false);

                Role adminRole = roleRepository.findByName(Role.ERole.ROLE_ADMIN)
                        .orElseThrow(() -> new RuntimeException("Admin role not found!"));
                Set<Role> roles = new HashSet<>();
                roles.add(adminRole);
                adminUser.setRoles(roles);

                userRepository.save(adminUser);
                logger.info("Default admin user initialized successfully with email: {}", adminEmail);
            } else {
                logger.info("Admin user already exists in database.");
            }
        }
        catch(Exception e){
            logger.error("Error during DataInitializer execution: {}", e.getMessage());
        }
        logger.info("DataInitializer execution completed.");
    }
}
