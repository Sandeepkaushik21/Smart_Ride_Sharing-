package com.infosys.rsa.service;

import com.infosys.rsa.config.JwtUtils;
import com.infosys.rsa.dto.*;
import com.infosys.rsa.model.Role;
import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.RoleRepository;
import com.infosys.rsa.repository.UserRepository;
import com.infosys.rsa.security.UserDetailsServiceImpl.UserPrincipal;
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
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Error: Email is already taken!");
        }

        if (request.getPhone() != null && !request.getPhone().isEmpty() && userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Error: Phone is already taken!");
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

        // Set roles
        Set<Role> roles = new HashSet<>();
        String roleStr = request.getRole() != null ? request.getRole().toUpperCase() : "PASSENGER";
        
        if (roleStr.equals("DRIVER")) {
            Role driverRole = roleRepository.findByName(Role.ERole.ROLE_DRIVER)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(driverRole);
            user.setVehicleModel(request.getVehicleModel());
            user.setLicensePlate(request.getLicensePlate());
            user.setVehicleCapacity(request.getVehicleCapacity());
            user.setIsApproved(null); // Drivers need admin approval - null means pending review
        } else {
            Role passengerRole = roleRepository.findByName(Role.ERole.ROLE_PASSENGER)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(passengerRole);
            user.setIsApproved(true); // Passengers auto-approved
        }

        user.setRoles(roles);
        user.setIsActive(true);
        
        User savedUser = userRepository.save(user);

        // Send email with temp credentials
        String userType = roleStr.equals("DRIVER") ? "Driver" : "Passenger";
        emailService.sendTempCredentials(savedUser.getEmail(), tempPassword, userType);

        // Generate JWT token
        UserPrincipal userPrincipal = UserPrincipal.create(savedUser);
        String jwt = jwtUtils.generateToken(userPrincipal);

        List<String> roleNames = savedUser.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toList());

        return new JwtResponse(jwt, "Bearer", savedUser.getId(), savedUser.getEmail(), 
                savedUser.getName(), roleNames, savedUser.getIsFirstLogin());
    }

    public JwtResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        // Check if using temp password or regular password
        String passwordToCheck = request.getPassword();
        boolean isTempPassword = user.getIsFirstLogin() && user.getTempPassword() != null && 
                                 passwordToCheck.equals(user.getTempPassword());

        if (!isTempPassword && !passwordEncoder.matches(passwordToCheck, user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        // For temp password, manually authenticate; otherwise use authentication manager
        UserPrincipal userPrincipal;
        if (isTempPassword) {
            userPrincipal = UserPrincipal.create(user);
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userPrincipal, null, userPrincipal.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } else {
            // Authenticate normally
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            userPrincipal = (UserPrincipal) authentication.getPrincipal();
        }

        String jwt = jwtUtils.generateToken(userPrincipal);

        List<String> roles = userPrincipal.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        return new JwtResponse(jwt, "Bearer", userPrincipal.getId(), 
                userPrincipal.getUsername(), user.getName(), roles, user.getIsFirstLogin());
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Validate current password
        boolean isTempPassword = user.getIsFirstLogin() && user.getTempPassword() != null && 
                                 request.getCurrentPassword().equals(user.getTempPassword());
        
        if (!isTempPassword && !passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        // Set new password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setIsFirstLogin(false);
        user.setTempPassword(null);
        userRepository.save(user);
    }
}

