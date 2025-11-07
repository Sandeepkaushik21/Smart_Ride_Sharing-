package com.infosys.rsa.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
public class AuthCheckController {

    private static final Logger logger = LoggerFactory.getLogger(AuthCheckController.class);

    @GetMapping("/whoami")
    public Map<String, Object> whoami() {
        logger.info("Entering method: whoami()");
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Map<String, Object> resp = new HashMap<>();

        if (auth == null) {
            logger.warn("No authentication found in SecurityContext");
            resp.put("authenticated", false);
            logger.info("Returning unauthenticated response: {}", resp);
            return resp;
        }

        resp.put("authenticated", true);
        resp.put("username", auth.getName());
        logger.debug("Authenticated user: {}", auth.getName());

        List<String> authorities = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());
        logger.debug("Authorities for user {}: {}", auth.getName(), authorities);

        resp.put("authorities", authorities);
        resp.put("details", auth.getDetails());

        logger.info("Returning authentication details for user: {}", auth.getName());
        return resp;
    }
}
