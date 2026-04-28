package com.scm.auth_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final JavaMailSender mailSender;

    private record OtpEntry(String code, Instant expiresAt) {
        boolean isExpired() { return Instant.now().isAfter(expiresAt); }
    }

    private final ConcurrentHashMap<String, OtpEntry> store = new ConcurrentHashMap<>();
    private static final long OTP_TTL_SECONDS = 600; // 10 minutes
    private static final SecureRandom RANDOM = new SecureRandom();

    public String generateAndSend(String email) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        store.put(email.toLowerCase(), new OtpEntry(code, Instant.now().plusSeconds(OTP_TTL_SECONDS)));
        sendEmail(email, code);
        return code;
    }

    public boolean verify(String email, String code) {
        OtpEntry entry = store.get(email.toLowerCase());
        if (entry == null || entry.isExpired()) return false;
        if (!entry.code().equals(code)) return false;
        store.remove(email.toLowerCase());
        return true;
    }

    private void sendEmail(String to, String code) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setSubject("Your SCM Platform verification code");
            msg.setText(
                "Your one-time verification code is: " + code + "\n\n" +
                "This code expires in 10 minutes.\n\n" +
                "If you did not create an account, you can safely ignore this email."
            );
            mailSender.send(msg);
            log.info("OTP email sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", to, e.getMessage());
        }
    }
}
