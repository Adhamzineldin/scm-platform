package com.scm.api_gateway.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Wires the JWT interceptor into Spring MVC. Public auth endpoints
 * ({@code /api/auth/**}) and Eureka/actuator probes are excluded.
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final JwtAuthFilter jwtAuthFilter;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(jwtAuthFilter)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/auth/**",        // login + register are public
                        "/actuator/**",
                        "/eureka/**"
                );
    }
}

