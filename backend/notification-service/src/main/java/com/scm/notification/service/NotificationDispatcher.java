package com.scm.notification.service;

import com.scm.notification.client.DocumentClient;
import com.scm.notification.client.UserClient;
import com.scm.notification.client.dto.OrderReceiptRequest;
import com.scm.notification.dto.NotificationContext;
import com.scm.notification.dto.OrderConfirmationContext;
import com.scm.notification.dto.OrderCreatedEvent;
import com.scm.notification.dto.OrderStatusChangedEvent;
import com.scm.notification.dto.StatusUpdateContext;
import com.scm.notification.dto.UserDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationDispatcher {

    private final List<NotificationSender> senders;
    private final UserClient userClient;
    private final DocumentClient documentClient;

    public void dispatchOrderConfirmation(OrderCreatedEvent event) {
        UserDto user = userClient.getUserById(event.userId());
        byte[] receipt = generateReceipt(event);

        OrderConfirmationContext context = new OrderConfirmationContext(event, user, receipt);
        fanOut(context, sender -> sender.sendOrderConfirmation(context));
    }

    public void dispatchStatusUpdate(OrderStatusChangedEvent event) {
//        UserDto user = userClient.getUserById(event.userId());
        //TODO: use client when it's ready
        UserDto user = new UserDto(
                "1",
                "mohalya3@gmail.com",
                "Adham Zineldin",
                "01157000509"
        );

        StatusUpdateContext context = new StatusUpdateContext(event, user);
        fanOut(context, sender -> sender.sendStatusUpdate(context));
    }

    private byte[] generateReceipt(OrderCreatedEvent event) {
        OrderReceiptRequest request = new OrderReceiptRequest(
                event.orderId(),
                event.userId(),
                event.shippingAddress(),
                event.status(),
                event.idempotencyKey(),
                event.createdAt(),
                event.items()
        );
        return documentClient.generateOrderReceipt(request);
    }

    private void fanOut(NotificationContext context, Consumer<NotificationSender> action) {
        log.info("Dispatching Order #{} to {} channel(s) for user {}",
                context.orderId(), senders.size(), context.user().id());

        List<String> failures = senders.stream()
                .map(sender -> attempt(sender, action))
                .flatMap(Optional::stream)
                .toList();

        if (!failures.isEmpty()) {
            throw new NotificationDispatchException(
                    "Notification dispatch failed for Order #" + context.orderId() + " on channels: " + failures
            );
        }
    }

    private Optional<String> attempt(NotificationSender sender, Consumer<NotificationSender> action) {
        try {
            action.accept(sender);
            return Optional.empty();
        } catch (Exception ex) {
            log.error("Channel [{}] failed: {}", sender.channel(), ex.getMessage());
            return Optional.of(sender.channel());
        }
    }
}
