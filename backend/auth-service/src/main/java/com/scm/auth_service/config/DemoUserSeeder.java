package com.scm.auth_service.config;

import com.scm.auth_service.entity.Role;
import com.scm.auth_service.entity.User;
import com.scm.auth_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds demo accounts for every role so the full system can be demoed.
 * Runs after AdminSeeder (@Order 1) so admin is already ID=1.
 *
 * Resulting IDs are predictable only in a fresh local database:
 *   1  admin            ADMIN
 *   2  alice            CUSTOMER
 *   3  bob              CUSTOMER
 *   4  carol            CUSTOMER
 *   5  david            CUSTOMER
 *   6  eve.ops          ORDER_PROCESSING
 *   7  frank.inventory  INVENTORY_MANAGER
 *   8  grace.warehouse  WAREHOUSE_SPECIALIST
 *   9  henry.shipment   SHIPMENT_LEAD
 *  10  ivan.staff       STAFF
 *
 * Password for all demo accounts: Demo@12345
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(2)
public class DemoUserSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private record UserSeed(String username, String email, Role role) {}

    static final String DEMO_PASSWORD = "Demo@12345";

    private static final List<UserSeed> DEMO_USERS = List.of(
        new UserSeed("alice",           "alice@demo.com", Role.CUSTOMER),
        new UserSeed("bob",             "bob@demo.com",   Role.CUSTOMER),
        new UserSeed("carol",           "carol@demo.com", Role.CUSTOMER),
        new UserSeed("david",           "david@demo.com", Role.CUSTOMER),
        new UserSeed("eve.ops",         "eve@demo.com",   Role.ORDER_PROCESSING),
        new UserSeed("frank.inventory", "frank@demo.com", Role.INVENTORY_MANAGER),
        new UserSeed("grace.warehouse", "grace@demo.com", Role.WAREHOUSE_SPECIALIST),
        new UserSeed("henry.shipment",  "henry@demo.com", Role.SHIPMENT_LEAD),
        new UserSeed("ivan.staff",      "ivan@demo.com",  Role.STAFF)
    );

    @Override
    public void run(String... args) {
        if (userRepository.count() > 1) {
            log.info("[DemoUserSeeder] Demo users already present — skipping.");
            return;
        }

        String encoded = passwordEncoder.encode(DEMO_PASSWORD);
        for (UserSeed seed : DEMO_USERS) {
            User user = User.builder()
                    .username(seed.username())
                    .email(seed.email())
                    .password(encoded)
                    .role(seed.role())
                    .emailVerified(true)
                    .build();
            userRepository.save(user);
        }

        log.warn("================================================================");
        log.warn(" [DemoUserSeeder] {} demo users created", DEMO_USERS.size());
        log.warn("   Password for all: {}", DEMO_PASSWORD);
        log.warn("================================================================");
    }
}
