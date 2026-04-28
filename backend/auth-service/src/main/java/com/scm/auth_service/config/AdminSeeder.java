package com.scm.auth_service.config;

import com.scm.auth_service.entity.Role;
import com.scm.auth_service.entity.User;
import com.scm.auth_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * On startup, ensure at least one ADMIN user exists. If none does, seed one
 * using credentials from environment / application config so we have a way
 * to log in and grant roles to other users.
 *
 * <p>Override defaults via env vars in docker-compose / AWS:
 * <pre>
 *   ADMIN_BOOTSTRAP_EMAIL=admin@scm.local
 *   ADMIN_BOOTSTRAP_USERNAME=admin
 *   ADMIN_BOOTSTRAP_PASSWORD=Admin@12345
 * </pre>
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.bootstrap.email:admin@scm.local}")
    private String adminEmail;

    @Value("${admin.bootstrap.username:admin}")
    private String adminUsername;

    @Value("${admin.bootstrap.password:Admin@12345}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        // Idempotent on the configured email: if a user with that email already
        // exists, make sure they are an ADMIN; otherwise create the bootstrap
        // ADMIN. Other ADMIN accounts under different emails are left alone.
        userRepository.findByEmail(adminEmail).ifPresentOrElse(
                existing -> {
                    if (existing.getRole() != Role.ADMIN) {
                        log.warn("[AdminSeeder] User {} exists with role {} — promoting to ADMIN.",
                                adminEmail, existing.getRole());
                        existing.setRole(Role.ADMIN);
                        userRepository.save(existing);
                    } else {
                        log.info("[AdminSeeder] Bootstrap ADMIN {} already exists — nothing to do.",
                                adminEmail);
                    }
                },
                () -> {
                    User admin = User.builder()
                            .username(adminUsername)
                            .email(adminEmail)
                            .password(passwordEncoder.encode(adminPassword))
                            .role(Role.ADMIN)
                            .emailVerified(true)
                            .build();
                    userRepository.save(admin);

                    log.warn("================================================================");
                    log.warn(" [AdminSeeder] Bootstrap ADMIN user created");
                    log.warn("   email:    {}", adminEmail);
                    log.warn("   password: {}   <-- CHANGE THIS IN PRODUCTION", adminPassword);
                    log.warn("================================================================");
                }
        );
    }
}

