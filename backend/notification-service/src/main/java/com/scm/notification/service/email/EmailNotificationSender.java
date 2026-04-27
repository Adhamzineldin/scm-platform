package com.scm.notification.service.email;

import com.scm.notification.dto.OrderConfirmationContext;
import com.scm.notification.dto.StatusUpdateContext;
import com.scm.notification.service.NotificationSender;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
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
    @Retryable(
            retryFor = EmailDeliveryException.class,
            maxAttempts = 3,
            backoff = @Backoff(delay = 1000, multiplier = 2.0, maxDelay = 5000)
    )
    public void sendOrderConfirmation(OrderConfirmationContext context) {
        Long orderId = context.event().orderId();
        String toAddress = context.user().email();
        log.info("Sending order confirmation email for Order #{} to {}", orderId, toAddress);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toAddress);
            helper.setSubject("Order #" + orderId + " Confirmation");
            helper.setText(contentBuilder.buildOrderConfirmation(context), true);
            attachReceipt(helper, context);

            mailSender.send(message);
            log.info("Confirmation email delivered for Order #{}", orderId);
        } catch (MessagingException | MailException e) {
            throw new EmailDeliveryException("SMTP delivery failed for Order #" + orderId, e);
        }
    }

    @Override
    @Retryable(
            retryFor = EmailDeliveryException.class,
            maxAttempts = 3,
            backoff = @Backoff(delay = 1000, multiplier = 2.0, maxDelay = 5000)
    )
    public void sendStatusUpdate(StatusUpdateContext context) {
        Long orderId = context.event().orderId();
        String toAddress = context.user().email();
        log.info("Sending status update email for Order #{} to {} ({} -> {})",
                orderId, toAddress, context.event().previousStatus(), context.event().newStatus());

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(toAddress);
            helper.setSubject("Order #" + orderId + " is now " + context.event().newStatus());
            helper.setText(contentBuilder.buildStatusUpdate(context), true);

            mailSender.send(message);
            log.info("Status update email delivered for Order #{}", orderId);
        } catch (MessagingException | MailException e) {
            throw new EmailDeliveryException("SMTP delivery failed for Order #" + orderId, e);
        }
    }

    private void attachReceipt(MimeMessageHelper helper, OrderConfirmationContext context) throws MessagingException {
        byte[] pdf = context.receiptPdf();
        if (pdf == null || pdf.length == 0) {
            log.warn("No PDF receipt available for Order #{}, sending email without attachment",
                    context.event().orderId());
            return;
        }
        String filename = "order-receipt-" + context.event().orderId() + ".pdf";
        helper.addAttachment(filename, new ByteArrayResource(pdf), "application/pdf");
    }
}
