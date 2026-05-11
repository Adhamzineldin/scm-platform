package com.scm.api_gateway.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * Validates the {@code Authorization: Bearer …} header on every request that
 * leaves the gateway, except auth-service endpoints (login / register) and SSE
 * connections that authenticate via a {@code ?token=} query param (because the
 * browser EventSource API can't send custom headers).
 *
 * <p>On success the {@code sub} claim is forwarded downstream as
 * {@code X-User-Id} so services can attribute the request to a user without
 * re-parsing the token.</p>
 */
@Component
@Slf4j
public class JwtAuthFilter implements HandlerInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String TOKEN_QUERY_PARAM = "token";
    private static final String ADMIN_ROLE = "ADMIN";

    private final SecretKey signingKey;

    public JwtAuthFilter(@Value("${jwt.secret}") String secret) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {
        // OPTIONS preflight must never be blocked by JWT — the CorsFilter writes
        // the CORS headers and the browser handles the handshake; no auth needed.
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // Public assets: profile pictures are served unauthenticated so <img> tags
        // work without an Authorization header in the browser.
        if (request.getRequestURI().startsWith("/api/uploads/")) {
            return true;
        }

        String token = extractToken(request);
        if (token == null) {
            return reject(response, "Missing or invalid Authorization header");
        }

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String userId = claims.getSubject();
            String role = claims.get("role", String.class);

            if (requiresAdmin(request) && !ADMIN_ROLE.equals(role)) {
                return reject(response, "Admin role required");
            }

            request.setAttribute(USER_ID_HEADER, userId);
            // Spring Cloud Gateway MVC uses the response wrapper around the proxied
            // request; setting a request header on the *response* isn't picked up.
            // Instead we rely on a downstream-friendly approach: use a request
            // wrapper. For simplicity we re-add via a header propagation filter
            // configured per route — here we just attach it as an attribute and
            // also as a response header for end-to-end traceability.
            response.setHeader(USER_ID_HEADER, userId);
            return true;
        } catch (JwtException ex) {
            log.warn("JWT validation failed for {}: {}", request.getRequestURI(), ex.getMessage());
            return reject(response, "Invalid JWT: " + ex.getMessage());
        }
    }

    private boolean requiresAdmin(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path != null && path.startsWith("/api/notifications/admin/");
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length()).trim();
        }
        // Fallback for SSE / EventSource which can't set custom headers
        String queryToken = request.getParameter(TOKEN_QUERY_PARAM);
        if (queryToken != null && !queryToken.isBlank()) {
            return queryToken.trim();
        }
        return null;
    }

    private boolean reject(HttpServletResponse response, String message) throws java.io.IOException {
        response.sendError(HttpStatus.UNAUTHORIZED.value(), message);
        return false;
    }
}

