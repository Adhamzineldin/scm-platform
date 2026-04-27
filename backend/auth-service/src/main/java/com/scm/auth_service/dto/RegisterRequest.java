package com.scm.auth_service.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * Public registration payload.
 *
 * <p><b>Security note:</b> the role is intentionally NOT accepted from the
 * client — every self-registered user is created with {@code Role.STAFF}.
 * Privileged roles (ADMIN, INVENTORY_MANAGER, …) are granted by an existing
 * admin via {@code PATCH /api/admin/users/{id}/role}.</p>
 */
@Getter
@Setter
public class RegisterRequest {
    private String username;
    private String email;
    private String password;
}