package com.scm.auth_service.controller;

import com.scm.auth_service.entity.User;
import com.scm.auth_service.repository.UserRepository;
import com.scm.auth_service.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final UserRepository userRepository;
    private final StorageService storageService;

    @GetMapping("/me")
    public Map<String, Object> getMyDashboard(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("role", user.getRole().name());
        response.put("menuItems", getMenuByRole(user.getRole().name()));
        response.put("profilePictureUrl", user.getProfilePictureUrl());
        return response;
    }

    @PostMapping(value = "/profile/picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadProfilePicture(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only image files are allowed"));
        }

        if (file.getSize() > 5L * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("error", "File size must not exceed 5 MB"));
        }

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            String url = storageService.store(file, user.getId());
            user.setProfilePictureUrl(url);
            userRepository.save(user);
            Map<String, Object> result = new HashMap<>();
            result.put("profilePictureUrl", url);
            return ResponseEntity.ok(result);
        } catch (IOException ex) {
            log.error("[DashboardController] Failed to store profile picture for user {}", user.getId(), ex);
            return ResponseEntity.internalServerError().body(Map.of("error", "Upload failed, please try again"));
        }
    }

    private List<String> getMenuByRole(String role) {
        return switch (role) {
            case "ADMIN" -> List.of(
                    "Dashboard", "Users", "Inventory", "Orders", "Warehouse", "Shipments", "Reports"
            );
            case "INVENTORY_MANAGER" -> List.of(
                    "Dashboard", "Inventory", "Low Stock", "Inventory Reports"
            );
            case "ORDER_PROCESSING" -> List.of(
                    "Dashboard", "Orders", "Order Reports"
            );
            case "WAREHOUSE_SPECIALIST" -> List.of(
                    "Dashboard", "Warehouse Movements", "Storage Zones"
            );
            case "SHIPMENT_LEAD" -> List.of(
                    "Dashboard", "Shipments", "Shipment Tracking"
            );
            case "CLOUD_ARCHITECT" -> List.of(
                    "Dashboard", "Monitoring", "System Health"
            );
            case "STAFF" -> List.of("Dashboard", "Profile");
            default -> List.of("Dashboard");
        };
    }
}
