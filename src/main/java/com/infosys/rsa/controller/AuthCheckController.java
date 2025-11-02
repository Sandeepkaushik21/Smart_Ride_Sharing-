package com.infosys.rsa.controller;

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

    @GetMapping("/whoami")
    public Map<String, Object> whoami() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Map<String, Object> resp = new HashMap<>();
        if (auth == null) {
            resp.put("authenticated", false);
            return resp;
        }

        resp.put("authenticated", true);
        resp.put("username", auth.getName());
        List<String> authorities = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());
        resp.put("authorities", authorities);
        resp.put("details", auth.getDetails());
        return resp;
    }
}

