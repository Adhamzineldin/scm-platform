package com.scm.api_gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "gateway.cors")
public class CorsConfig {

    /**
     * By default we accept any origin (works with credentials thanks to
     * {@code setAllowedOriginPatterns}). In production set
     * {@code GATEWAY_CORS_ALLOWED_ORIGINS} (comma-separated) to lock this down,
     * e.g. {@code https://app.example.com}.
     */
    private List<String> allowedOrigins = List.of("*");

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowCredentials(true);
        // Use patterns (not setAllowedOrigins) so "*" is legal alongside credentials.
        cors.setAllowedOriginPatterns(allowedOrigins);
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("*"));
        cors.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        cors.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return new CorsFilter(source);
    }

    public List<String> getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }
}
