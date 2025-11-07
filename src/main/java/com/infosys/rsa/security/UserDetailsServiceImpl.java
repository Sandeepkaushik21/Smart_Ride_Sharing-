package com.infosys.rsa.security;

import com.infosys.rsa.model.User;
import com.infosys.rsa.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.stream.Collectors;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final Logger logger = LoggerFactory.getLogger(UserDetailsServiceImpl.class);

    @Autowired
    UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        logger.info("Attempting to load user by email: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    logger.error("User not found with email: {}", email);
                    return new UsernameNotFoundException("User Not Found with email: " + email);
                });

        logger.info("User found: {}, active={}, firstLogin={}", user.getEmail(), user.getIsActive(), user.getIsFirstLogin());
        logger.debug("User roles: {}", user.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toList()));

        return UserPrincipal.create(user);
    }

    public static class UserPrincipal implements UserDetails {
        private Long id;
        private String email;
        private String password;
        private Collection<? extends GrantedAuthority> authorities;
        private Boolean isActive;
        private Boolean isFirstLogin;

        public UserPrincipal(Long id, String email, String password, Collection<? extends GrantedAuthority> authorities,
                             Boolean isActive, Boolean isFirstLogin) {
            this.id = id;
            this.email = email;
            this.password = password;
            this.authorities = authorities;
            this.isActive = isActive;
            this.isFirstLogin = isFirstLogin;
        }

        public static UserPrincipal create(User user) {
            Collection<GrantedAuthority> authorities = user.getRoles().stream()
                    .map(role -> new SimpleGrantedAuthority(role.getName().name()))
                    .collect(Collectors.toList());

            Logger logger = LoggerFactory.getLogger(UserPrincipal.class);
            logger.debug("Creating UserPrincipal for user ID: {}, roles: {}", user.getId(),
                    authorities.stream().map(GrantedAuthority::getAuthority).collect(Collectors.toList()));

            return new UserPrincipal(
                    user.getId(),
                    user.getEmail(),
                    user.getPassword(),
                    authorities,
                    user.getIsActive(),
                    user.getIsFirstLogin()
            );
        }

        public Long getId() {
            return id;
        }

        public Boolean getIsFirstLogin() {
            return isFirstLogin;
        }

        @Override
        public Collection<? extends GrantedAuthority> getAuthorities() {
            return authorities;
        }

        @Override
        public String getPassword() {
            return password;
        }

        @Override
        public String getUsername() {
            return email;
        }

        @Override
        public boolean isAccountNonExpired() {
            return true;
        }

        @Override
        public boolean isAccountNonLocked() {
            return true;
        }

        @Override
        public boolean isCredentialsNonExpired() {
            return true;
        }

        @Override
        public boolean isEnabled() {
            return isActive;
        }
    }
}
