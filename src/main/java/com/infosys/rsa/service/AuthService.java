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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private EmailService emailService;

    @Value("${google.client.id}")
    private String googleClientId;

    // ========================= GOOGLE LOGIN =========================

    @Transactional
    public JwtResponse loginWithGoogle(GoogleLoginRequest request) {
        logger.info("Google login attempt");

        try {
            // Validate Google Client ID is configured
            if (googleClientId == null || googleClientId.isEmpty() || googleClientId.contains("YOUR_GOOGLE_CLIENT_ID")) {
                logger.error("Google Client ID is not configured properly");
                throw new RuntimeException("Google OAuth is not properly configured. Please contact administrator.");
            }

            logger.debug("Verifying Google token with client ID: {}", googleClientId.substring(0, Math.min(20, googleClientId.length())) + "...");

            // Verify Google ID token
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), 
                    GsonFactory.getDefaultInstance()
            )
            .setAudience(Collections.singletonList(googleClientId))
            .build();

            GoogleIdToken idToken = verifier.verify(request.getIdToken());
            if (idToken == null) {
                throw new BadCredentialsException("Invalid Google token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");

            logger.info("Google login verified for email: {}", email);

            // Check if user exists
            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null) {
                // Create new user
                user = new User();
                user.setEmail(email);
                user.setName(name != null ? name : email);
                user.setProvider("google");
                user.setProviderId(googleId);
                // Generate a random password for OAuth users (they won't use it)
                user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                user.setIsFirstLogin(false);
                user.setIsActive(true);

                // Set role
                Set<Role> roles = new HashSet<>();
                String roleStr = (request.getRole() == null || request.getRole().isEmpty()) 
                        ? "PASSENGER" 
                        : request.getRole().toUpperCase();

                if ("DRIVER".equals(roleStr)) {
                    Role driverRole = roleRepository.findByName(Role.ERole.ROLE_DRIVER)
                            .orElseThrow(() -> new RuntimeException("Driver role not found"));
                    roles.add(driverRole);
                    user.setIsApproved(null);
                } else {
                    Role passengerRole = roleRepository.findByName(Role.ERole.ROLE_PASSENGER)
                            .orElseThrow(() -> new RuntimeException("Passenger role not found"));
                    roles.add(passengerRole);
                    user.setIsApproved(true);
                }

                user.setRoles(roles);
                user = userRepository.save(user);
                logger.info("New user created via Google OAuth: {}", email);
            } else {
                // Existing user - check if it's a Google user or convert it
                if (!"google".equals(user.getProvider())) {
                    // User exists with local account but logging in with Google
                    // Update to Google provider
                    user.setProvider("google");
                    user.setProviderId(googleId);
                    user.setName(name != null ? name : user.getName());
                    user = userRepository.save(user);
                    logger.info("User account linked to Google: {}", email);
                } else {
                    // Update name in case it changed
                    if (name != null && !name.equals(user.getName())) {
                        user.setName(name);
                        user = userRepository.save(user);
                    }
                }

                if (Boolean.FALSE.equals(user.getIsActive())) {
                    throw new BadCredentialsException("Account is inactive");
                }
            }

            // Create authentication
            UserPrincipal principal = UserPrincipal.create(user);
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    principal.getAuthorities()
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Generate JWT
            String jwt = jwtUtils.generateToken(principal);
            return buildJwtResponse(jwt, principal, user);

        } catch (BadCredentialsException e) {
            logger.error("Google login failed (BadCredentials): {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Google login failed with exception: {}", e.getMessage(), e);
            // Log the full stack trace for debugging
            logger.error("Exception type: {}", e.getClass().getName());
            if (e.getCause() != null) {
                logger.error("Caused by: {}", e.getCause().getMessage());
            }
            throw new RuntimeException("Google authentication failed: " + e.getMessage(), e);
        }
    }

    // ========================= REGISTER =========================

    @Transactional
    public JwtResponse register(RegisterRequest request) {
        logger.info("Registering user with email {}", request.getEmail());

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyTakenException("Email already taken");
        }

        if (request.getPhone() != null && userRepository.existsByPhone(request.getPhone())) {
            throw new PhoneAlreadyTakenException("Phone already taken");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setProvider("local");

        // Temporary password
        String tempPassword = UUID.randomUUID().toString().substring(0, 10);
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setTempPassword(tempPassword);
        user.setIsFirstLogin(true);
        user.setIsActive(true);

        // Roles
        Set<Role> roles = new HashSet<>();
        String roleStr = request.getRole() == null ? "PASSENGER" : request.getRole().toUpperCase();

        if ("DRIVER".equals(roleStr)) {
            Role driverRole = roleRepository.findByName(Role.ERole.ROLE_DRIVER)
                    .orElseThrow(() -> new RuntimeException("Driver role not found"));
            roles.add(driverRole);

            user.setVehicleModel(request.getVehicleModel());
            user.setLicensePlate(request.getLicensePlate());
            user.setVehicleCapacity(request.getVehicleCapacity());
            user.setIsApproved(null);
        } else {
            Role passengerRole = roleRepository.findByName(Role.ERole.ROLE_PASSENGER)
                    .orElseThrow(() -> new RuntimeException("Passenger role not found"));
            roles.add(passengerRole);
            user.setIsApproved(true);
        }

        user.setRoles(roles);
        User savedUser = userRepository.save(user);

        // Send email
        emailService.sendTempCredentials(
                savedUser.getEmail(),
                tempPassword,
                roleStr.equals("DRIVER") ? "Driver" : "Passenger"
        );

        // JWT
        UserPrincipal principal = UserPrincipal.create(savedUser);
        String jwt = jwtUtils.generateToken(principal);

        return buildJwtResponse(jwt, principal, savedUser);
    }

    // ========================= LOGIN =========================

    public JwtResponse login(LoginRequest request) {
        logger.info("Login attempt for {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new BadCredentialsException("Account is inactive");
        }

        boolean isTempPassword =
                Boolean.TRUE.equals(user.getIsFirstLogin()) &&
                        user.getTempPassword() != null &&
                        request.getPassword().equals(user.getTempPassword());

        if (!isTempPassword) {
            // Normal authentication
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    )
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } else {
            // Temp password authentication
            UserPrincipal tempPrincipal = UserPrincipal.create(user);
            Authentication authentication =
                    new UsernamePasswordAuthenticationToken(
                            tempPrincipal,
                            null,
                            tempPrincipal.getAuthorities()
                    );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        // ALWAYS create principal from DB (safe)
        UserPrincipal principal = UserPrincipal.create(user);
        String jwt = jwtUtils.generateToken(principal);

        return buildJwtResponse(jwt, principal, user);
    }

    // ========================= CHANGE PASSWORD =========================

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isTempPassword =
                Boolean.TRUE.equals(user.getIsFirstLogin()) &&
                        user.getTempPassword() != null &&
                        request.getCurrentPassword().equals(user.getTempPassword());

        if (!isTempPassword &&
                !passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setTempPassword(null);
        user.setIsFirstLogin(false);

        userRepository.save(user);
    }

    // ========================= FORGOT PASSWORD =========================

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("If email exists, password sent"));

        if (Boolean.TRUE.equals(user.getIsFirstLogin())) {
            throw new RuntimeException("Complete first login before reset");
        }

        String tempPassword = UUID.randomUUID().toString().substring(0, 10);
        user.setTempPassword(tempPassword);
        user.setIsFirstLogin(true);
        userRepository.save(user);

        emailService.sendForgotPasswordEmail(
                user.getEmail(),
                tempPassword,
                user.getName()
        );
    }

    // ========================= RESET PASSWORD =========================

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid request"));

        if (!Objects.equals(user.getTempPassword(), request.getTempPassword())) {
            throw new RuntimeException("Invalid temporary password");
        }

        if (!Boolean.TRUE.equals(user.getIsFirstLogin())) {
            throw new RuntimeException("Invalid reset state");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setTempPassword(null);
        user.setIsFirstLogin(false);

        userRepository.save(user);
    }

    // ========================= HELPER =========================

    private JwtResponse buildJwtResponse(String jwt, UserPrincipal principal, User user) {

        List<String> roles = principal.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .collect(Collectors.toList());

        return new JwtResponse(
                jwt,
                "Bearer",
                principal.getId(),
                principal.getUsername(),
                user.getName(),
                roles,
                user.getIsFirstLogin()
        );
    }
}
