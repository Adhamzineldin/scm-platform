package com.scm.auth_service.config;

import com.scm.auth_service.entity.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Hibernate's {@code ddl-auto=update} creates a CHECK constraint on the
 * {@code users.role} column the first time the schema is generated, but it
 * never updates that constraint when new enum values are added later. As a
 * result, inserting a user with a newly added role (e.g. {@code STAFF}) fails
 * with {@code violates check constraint "users_role_check"}.
 *
 * <p>This runner drops and recreates the constraint on every startup so it
 * always matches the current {@link Role} enum.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(0) // run before AdminSeeder
public class SchemaPatcher implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_role_check");

            String values = Arrays.stream(Role.values())
                    .map(r -> "'" + r.name() + "'")
                    .collect(Collectors.joining(", "));

            jdbcTemplate.execute(
                    "ALTER TABLE IF EXISTS users ADD CONSTRAINT users_role_check " +
                            "CHECK (role IN (" + values + "))"
            );

            log.info("[SchemaPatcher] users_role_check refreshed with: {}", values);
        } catch (Exception ex) {
            log.warn("[SchemaPatcher] Could not refresh users_role_check (table may not exist yet): {}",
                    ex.getMessage());
        }
    }
}

