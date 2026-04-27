package com.scm.auth_service.config;

import com.scm.auth_service.security.JwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/inventory/**").hasAnyRole("ADMIN", "INVENTORY_MANAGER")
                        .requestMatchers("/api/orders/**").hasAnyRole("ADMIN", "ORDER_PROCESSING")
                        .requestMatchers("/api/warehouse/**").hasAnyRole("ADMIN", "WAREHOUSE_SPECIALIST")
                        .requestMatchers("/api/shipments/**").hasAnyRole("ADMIN", "SHIPMENT_LEAD")
                        // /api/dashboard/me works for any authenticated user (incl. STAFF)
                        .requestMatchers("/api/dashboard/**").authenticated()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}