package com.scm.notification.service.email;

import com.scm.notification.dto.NotificationContext;
import com.scm.notification.service.NotificationSender;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationSender implements NotificationSender {

    private static final String CHANNEL = "EMAIL";

    private final JavaMailSender mailSender;
    private final EmailContentBuilder contentBuilder;

    @Value("${spring.mail.username}")
    private String fromAddress;

    @Override
    public String channel() {
        return CHANNEL;
    }

    @Override
    public void send(NotificationContext context) {
        Long orderId = context.event().orderId();
        log.info("Sending order confirmation email for Order #{} to {}", orderId, context.user().email());

        try {
            MimeMessage message = buildMimeMessage(context);
            mailSender.send(message);

            log.info("Email delivered for Order #{}", orderId);
        } catch (MessagingException | MailException e) {
            throw new EmailDeliveryException("SMTP delivery failed for Order #" + orderId, e);
        }
    }

    private MimeMessage buildMimeMessage(NotificationContext context) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromAddress);
        helper.setTo(context.user().email());
        helper.setSubject("Order #" + context.event().orderId() + " Confirmation");
        helper.setText(contentBuilder.buildOrderConfirmation(context), true);

        return message;
    }
}
