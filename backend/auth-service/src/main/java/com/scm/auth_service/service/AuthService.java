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
    private final OtpService otpService;

    /** Step 1: Create unverified account and send OTP. */
    public OtpSentResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.CUSTOMER)
                .emailVerified(false)
                .build();

        userRepository.save(user);
        otpService.generateAndSend(request.getEmail());

        return new OtpSentResponse("Verification code sent to your email", request.getEmail());
    }

    /** Step 2: Verify OTP and return JWT. */
    public AuthResponse verifyOtp(OtpVerifyRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found for this email"));

        if (user.isEmailVerified()) {
            // Already verified — just return a token (idempotent)
            String token = jwtService.generateToken(user.getEmail(), user.getRole().name(), user.getId());
            return new AuthResponse(token, user.getUsername(), user.getRole().name());
        }

        if (!otpService.verify(request.getEmail(), request.getOtp())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid or expired verification code");
        }

        user.setEmailVerified(true);
        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name(), user.getId());
        return new AuthResponse(token, user.getUsername(), user.getRole().name());
    }

    /** Resend OTP (for existing unverified accounts). */
    public OtpSentResponse resendOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found for this email"));

        if (user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already verified");
        }

        otpService.generateAndSend(email);
        return new OtpSentResponse("Verification code resent", email);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Email not verified — please check your email for the verification code");
        }

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name(), user.getId());
        return new AuthResponse(token, user.getUsername(), user.getRole().name());
    }
}
