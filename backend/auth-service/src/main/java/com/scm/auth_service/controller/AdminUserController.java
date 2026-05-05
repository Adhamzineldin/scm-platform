package com.scm.auth_service.controller;

import com.scm.auth_service.dto.UpdateRoleRequest;
import com.scm.auth_service.dto.UserResponse;
import com.scm.auth_service.entity.User;
import com.scm.auth_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Admin-only user management. Protected by {@code SecurityConfig}:
 * {@code /api/admin/**} requires {@code ROLE_ADMIN}.
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;

    /** List every user — admin dashboard. */
    @GetMapping
    public Page<UserResponse> listUsers(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        return userRepository
                .findAll(PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by("id").ascending()))
                .map(UserResponse::from);
    }

    /** Change a user's role. Body: {@code { "role": "INVENTORY_MANAGER" }}. */
    @PatchMapping("/{id}/role")
    public UserResponse updateRole(@PathVariable Long id, @RequestBody UpdateRoleRequest body) {
        if (body.getRole() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role is required");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setRole(body.getRole());
        userRepository.save(user);
        return UserResponse.from(user);
    }
}

