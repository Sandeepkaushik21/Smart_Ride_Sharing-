package com.infosys.rsa.service;

import com.infosys.rsa.config.JwtUtils;
import com.infosys.rsa.dto.*;
import com.infosys.rsa.exception.EmailAlreadyTakenException;
import com.infosys.rsa.exception.PhoneAlreadyTakenException;
import com.infosys.rsa.model.Role;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.RoleRepository;
import com.infosys.rsa.repository.UserRepository;
import com.infosys.rsa.security.UserDetailsServiceImpl.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    EmailService emailService;

    @Transactional
    public JwtResponse register(RegisterRequest request) {
        logger.info("Attempting to register new user with email: {}", request.getEmail());

        if (userRepository.existsByEmail(request.getEmail())) {
            logger.error("Registration failed - Email {} is already taken", request.getEmail());
            throw new EmailAlreadyTakenException("Error: Email is already taken!");
        }

        if (request.getPhone() != null && !request.getPhone().isEmpty() && userRepository.existsByPhone(request.getPhone())) {
            logger.error("Registration failed - Phone {} is already taken", request.getPhone());
            throw new PhoneAlreadyTakenException("Error: Phone is already taken!");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());

        // Generate temporary password
        String tempPassword = UUID.randomUUID().toString().substring(0, 10);
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setTempPassword(tempPassword);
        user.setIsFirstLogin(true);

        logger.debug("Temporary password generated for user {}: [hidden for security]", request.getEmail());

        // Set roles
        Set<Role> roles = new HashSet<>();
        String roleStr = request.getRole() != null ? request.getRole().toUpperCase() : "PASSENGER";
        logger.info("Assigning role '{}' to user {}", roleStr, request.getEmail());

        if (roleStr.equals("DRIVER")) {
            Role driverRole = roleRepository.findByName(Role.ERole.ROLE_DRIVER)
                    .orElseThrow(() -> {
                        logger.error("Driver role not found in database");
                        return new RuntimeException("Error: Role is not found.");
                    });
            roles.add(driverRole);
            user.setVehicleModel(request.getVehicleModel());
            user.setLicensePlate(request.getLicensePlate());
            user.setVehicleCapacity(request.getVehicleCapacity());
            user.setIsApproved(null);
            logger.debug("Driver registration details set for {}", request.getEmail());
        } else {
            Role passengerRole = roleRepository.findByName(Role.ERole.ROLE_PASSENGER)
                    .orElseThrow(() -> {
                        logger.error("Passenger role not found in database");
                        return new RuntimeException("Error: Role is not found.");
                    });
            roles.add(passengerRole);
            user.setIsApproved(true);
        }

        user.setRoles(roles);
        user.setIsActive(true);

        User savedUser = userRepository.save(user);
        logger.info("User {} registered successfully with role {}", savedUser.getEmail(), roleStr);

        // Send email with temporary credentials
        String userType = roleStr.equals("DRIVER") ? "Driver" : "Passenger";
        emailService.sendTempCredentials(savedUser.getEmail(), tempPassword, userType);
        logger.info("Temporary credentials email sent to {}", savedUser.getEmail());

        // Generate JWT token
        UserPrincipal userPrincipal = UserPrincipal.create(savedUser);
        String jwt = jwtUtils.generateToken(userPrincipal);
        logger.debug("JWT token generated for new user {}", savedUser.getEmail());

        List<String> roleNames = savedUser.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toList());

        logger.info("Registration process completed for user {}", savedUser.getEmail());

        return new JwtResponse(jwt, "Bearer", savedUser.getId(), savedUser.getEmail(),
                savedUser.getName(), roleNames, savedUser.getIsFirstLogin());
    }

    public JwtResponse login(LoginRequest request) {
        logger.info("User attempting to log in with email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    logger.error("Login failed - Invalid email: {}", request.getEmail());
                    return new BadCredentialsException("Invalid email or password");
                });

        String passwordToCheck = request.getPassword();
        boolean isTempPassword = user.getIsFirstLogin() && user.getTempPassword() != null &&
                passwordToCheck.equals(user.getTempPassword());

        if (!isTempPassword && !passwordEncoder.matches(passwordToCheck, user.getPassword())) {
            logger.error("Login failed - Invalid credentials for {}", request.getEmail());
            throw new BadCredentialsException("Invalid email or password");
        }

        UserPrincipal userPrincipal;
        if (isTempPassword) {
            logger.debug("User {} logging in with temporary password", request.getEmail());
            userPrincipal = UserPrincipal.create(user);
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userPrincipal, null, userPrincipal.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } else {
            logger.debug("Authenticating user {} through authentication manager", request.getEmail());
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            userPrincipal = (UserPrincipal) authentication.getPrincipal();
        }

        String jwt = jwtUtils.generateToken(userPrincipal);
        logger.info("JWT token generated successfully for {}", request.getEmail());

        List<String> roles = userPrincipal.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        logger.info("User {} logged in successfully with roles: {}", request.getEmail(), roles);

        return new JwtResponse(jwt, "Bearer", userPrincipal.getId(),
                userPrincipal.getUsername(), user.getName(), roles, user.getIsFirstLogin());
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        logger.info("User ID {} attempting to change password", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.error("Password change failed - User ID {} not found", userId);
                    return new RuntimeException("User not found");
                });

        boolean isTempPassword = user.getIsFirstLogin() && user.getTempPassword() != null &&
                request.getCurrentPassword().equals(user.getTempPassword());

        if (!isTempPassword && !passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            logger.error("Password change failed - Incorrect current password for user ID {}", userId);
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setIsFirstLogin(false);
        user.setTempPassword(null);
        userRepository.save(user);

        logger.info("Password changed successfully for user ID {}", userId);
    }
}
