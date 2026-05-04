package com.scm.notification.service.email;

import com.scm.notification.dto.ShipmentDispatchedContext;
import com.scm.notification.dto.ShipmentDispatchedEvent;
import com.scm.notification.dto.UserDto;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailNotificationSenderTest {

    @Mock
    private JavaMailSender mailSender;
    @Mock
    private EmailContentBuilder contentBuilder;

    private EmailNotificationSender sender;

    @BeforeEach
    void setUp() {
        sender = new EmailNotificationSender(mailSender, contentBuilder);
        ReflectionTestUtils.setField(sender, "fromAddress", "noreply@scm.local");
    }

    @Test
    void deliveredUsesDeliveredSubject() throws Exception {
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(message);
        when(contentBuilder.buildShipmentDispatched(org.mockito.ArgumentMatchers.any())).thenReturn("<p>delivered</p>");

        ShipmentDispatchedEvent event = new ShipmentDispatchedEvent(
                1L, 99L, "1", "TRK-DEL", "DHL", "Address", "DELIVERED", "2026-05-04T10:00:00Z", null
        );
        ShipmentDispatchedContext context = new ShipmentDispatchedContext(event, new UserDto(1L, "alice", "alice@demo.com", "CUSTOMER"));

        sender.sendShipmentDispatched(context);

        verify(mailSender).send(message);
        assertThat(message.getSubject()).isEqualTo("Order #99 has been delivered");
    }

    @Test
    void shippedUsesShippedSubject() throws Exception {
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(message);
        when(contentBuilder.buildShipmentDispatched(org.mockito.ArgumentMatchers.any())).thenReturn("<p>shipped</p>");

        ShipmentDispatchedEvent event = new ShipmentDispatchedEvent(
                1L, 100L, "1", "TRK-SHP", "FedEx", "Address", "SHIPPED", "2026-05-04T09:00:00Z", "2026-05-04T09:00:00Z"
        );
        ShipmentDispatchedContext context = new ShipmentDispatchedContext(event, new UserDto(1L, "alice", "alice@demo.com", "CUSTOMER"));

        sender.sendShipmentDispatched(context);

        verify(mailSender).send(message);
        assertThat(message.getSubject()).isEqualTo("Order #100 has shipped — FedEx");
    }
}

