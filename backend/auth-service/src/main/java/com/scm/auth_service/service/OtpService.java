package com.scm.auth_service.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.username:noreply@scm-platform.local}")
    private String fromAddress;

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
            Context ctx = new Context(Locale.ENGLISH);
            ctx.setVariable("code", code);
            ctx.setVariable("expiryMinutes", OTP_TTL_SECONDS / 60);
            String html = templateEngine.process("otp-verification", ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Your SCM Platform verification code");
            helper.setText(html, true);

            mailSender.send(message);
            log.info("OTP email sent to {}", to);
        } catch (MessagingException | RuntimeException e) {
            log.error("Failed to send OTP email to {}: {}", to, e.getMessage());
        }
    }
}
