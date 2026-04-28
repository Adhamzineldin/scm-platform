package com.scm.warehouse_service.config;

import com.scm.warehouse_service.entity.ZoneType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Hibernate ddl-auto=update creates a CHECK constraint on warehouse_zones.type
 * when the schema is first generated, but never updates it when new enum values
 * are added. This patcher drops and recreates the constraint on every startup
 * so it always matches the current ZoneType enum.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(0)
public class SchemaPatcher implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute(
                "ALTER TABLE IF EXISTS warehouse_zones DROP CONSTRAINT IF EXISTS warehouse_zones_type_check"
            );

            String values = Arrays.stream(ZoneType.values())
                    .map(t -> "'" + t.name() + "'")
                    .collect(Collectors.joining(", "));

            jdbcTemplate.execute(
                "ALTER TABLE IF EXISTS warehouse_zones ADD CONSTRAINT warehouse_zones_type_check " +
                "CHECK (type IN (" + values + "))"
            );

            log.info("[SchemaPatcher] warehouse_zones_type_check refreshed with: {}", values);
        } catch (Exception ex) {
            log.warn("[SchemaPatcher] Could not refresh warehouse_zones_type_check (table may not exist yet): {}",
                    ex.getMessage());
        }
    }
}
