package com.scm.auth_service.service;

import com.scm.auth_service.dto.*;
import com.scm.auth_service.entity.Role;
import com.scm.auth_service.entity.User;
import com.scm.auth_service.repository.UserRepository;
import com.scm.auth_service.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse register(RegisterRequest request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        // Self-registration ALWAYS produces a low-privilege STAFF user.
        // Privileged roles must be granted by an admin via /api/admin/users/{id}/role.
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.CUSTOMER)
                .build();

        User saved = userRepository.save(user);

        String token = jwtService.generateToken(saved.getEmail(), saved.getRole().name(), saved.getId());
        return new AuthResponse(token, saved.getUsername(), saved.getRole().name());
    }

    public AuthResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name(), user.getId());

        return new AuthResponse(token, user.getUsername(), user.getRole().name());
    }
}