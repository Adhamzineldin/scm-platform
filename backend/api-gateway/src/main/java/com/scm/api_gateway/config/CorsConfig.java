package com.scm.api_gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

// This gateway uses Spring Cloud Gateway MVC (servlet stack, NOT WebFlux/reactive).
// The reactive CorsWebFilter is silently ignored in a servlet context.
// The correct type here is the servlet CorsFilter from org.springframework.web.filter.
@Configuration
@ConfigurationProperties(prefix = "gateway.cors")
public class CorsConfig {

    /**
     * Allowed origin patterns. Defaults to * (all).
     * Override via env var GATEWAY_CORS_ALLOWED_ORIGINS in production,
     * e.g. https://scm.maayn.com
     */
    private List<String> allowedOrigins = List.of("*");

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowCredentials(true);
        // setAllowedOriginPatterns supports "*" alongside allowCredentials=true.
        // With plain setAllowedOrigins("*") + credentials the spec forbids it
        // and browsers reject the response.
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
