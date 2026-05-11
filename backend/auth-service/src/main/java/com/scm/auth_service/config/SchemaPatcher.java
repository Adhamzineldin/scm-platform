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

            // Add profile_picture_url column if it doesn't exist yet (new in this release).
            try {
                jdbcTemplate.execute(
                    "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(1024)"
                );
                log.info("[SchemaPatcher] profile_picture_url column ensured");
            } catch (Exception ex) {
                log.warn("[SchemaPatcher] profile_picture_url column add skipped: {}", ex.getMessage());
            }

            // Backfill email_verified for any existing users created before 2FA was added.
            // Only updates NULL rows (column was just added, no default) — new unverified users have false explicitly.
            try {
                jdbcTemplate.execute(
                    "UPDATE users SET email_verified = true WHERE email_verified IS NULL"
                );
                log.info("[SchemaPatcher] Backfilled email_verified=true for pre-2FA users");
            } catch (Exception ex) {
                log.warn("[SchemaPatcher] email_verified backfill skipped (column may not exist yet): {}", ex.getMessage());
            }
        } catch (Exception ex) {
            log.warn("[SchemaPatcher] Could not refresh users_role_check (table may not exist yet): {}",
                    ex.getMessage());
        }
    }
}

