package com.scm.notification.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UserDto(
        Long id,
        String username,
        String email,
        String role
) {
    /** Convenience accessor — SSE registry and logs use userId as a String. */
    public String userId() {
        return id != null ? String.valueOf(id) : "unknown";
    }
}
