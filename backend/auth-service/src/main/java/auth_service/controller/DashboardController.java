package auth_service.controller;

import auth_service.entity.User;
import auth_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin("*")
public class DashboardController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public Map<String, Object> getMyDashboard(Authentication authentication) {

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return Map.of(
                "username", user.getUsername(),
                "email", user.getEmail(),
                "role", user.getRole().name(),
                "menuItems", getMenuByRole(user.getRole().name())
        );
    }

    private List<String> getMenuByRole(String role) {
        return switch (role) {
            case "ADMIN" -> List.of(
                    "Dashboard",
                    "Users",
                    "Inventory",
                    "Orders",
                    "Warehouse",
                    "Shipments",
                    "Reports"
            );
            case "INVENTORY_MANAGER" -> List.of(
                    "Dashboard",
                    "Inventory",
                    "Low Stock",
                    "Inventory Reports"
            );
            case "ORDER_PROCESSING" -> List.of(
                    "Dashboard",
                    "Orders",
                    "Order Reports"
            );
            case "WAREHOUSE_SPECIALIST" -> List.of(
                    "Dashboard",
                    "Warehouse Movements",
                    "Storage Zones"
            );
            case "SHIPMENT_LEAD" -> List.of(
                    "Dashboard",
                    "Shipments",
                    "Shipment Tracking"
            );
            case "CLOUD_ARCHITECT" -> List.of(
                    "Dashboard",
                    "Monitoring",
                    "System Health"
            );
            default -> List.of("Dashboard");
        };
    }
}