package com.scm.auth_service.dto;

import com.scm.auth_service.entity.Role;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateRoleRequest {
    private Role role;
}

