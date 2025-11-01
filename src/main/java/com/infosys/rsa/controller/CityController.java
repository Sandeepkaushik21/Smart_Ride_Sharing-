package com.infosys.rsa.controller;

import com.infosys.rsa.service.CityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/public")
public class CityController {
    @Autowired
    CityService cityService;

    @GetMapping("/cities/suggestions")
    public ResponseEntity<?> getCitySuggestions(@RequestParam(required = false) String query) {
        List<String> suggestions = cityService.getCitySuggestions(query);
        return ResponseEntity.ok(suggestions);
    }
}

