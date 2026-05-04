package com.scm.notification.service;

import com.scm.notification.client.DocumentClient;
import com.scm.notification.client.OrderClient;
import com.scm.notification.client.UserClient;
import com.scm.notification.client.dto.OrderLookupResponse;
import com.scm.notification.client.dto.OrderReceiptRequest;
import com.scm.notification.dto.NotificationContext;
import com.scm.notification.dto.OrderConfirmationContext;
import com.scm.notification.dto.OrderCreatedEvent;
import com.scm.notification.dto.OrderStatusChangedEvent;
import com.scm.notification.dto.ShipmentDispatchedContext;
import com.scm.notification.dto.ShipmentDispatchedEvent;
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
    private final OrderClient orderClient;
    private final DocumentClient documentClient;

    public void dispatchOrderConfirmation(OrderCreatedEvent event) {
        UserDto user = resolveUser(event.userId());
        byte[] receipt = tryGenerateReceipt(event);
        OrderConfirmationContext context = new OrderConfirmationContext(event, user, receipt);
        fanOut(context, sender -> sender.sendOrderConfirmation(context));
    }

    public void dispatchStatusUpdate(OrderStatusChangedEvent event) {
        UserDto user = resolveUser(event.userId());
        StatusUpdateContext context = new StatusUpdateContext(event, user);
        fanOut(context, sender -> sender.sendStatusUpdate(context));
    }

    public void dispatchShipmentConfirmation(ShipmentDispatchedEvent event) {
        UserDto user = resolveUser(event.userId(), event.orderId());
        ShipmentDispatchedContext context = new ShipmentDispatchedContext(event, user);
        fanOut(context, sender -> sender.sendShipmentDispatched(context));
    }

    private UserDto resolveUser(String userId) {
        return resolveUser(userId, null);
    }

    private UserDto resolveUser(String userId, Long orderId) {
        if (userId == null || userId.isBlank()) {
            String fallbackUserId = resolveUserIdFromOrder(orderId);
            if (fallbackUserId != null && !fallbackUserId.isBlank()) {
                userId = fallbackUserId;
            } else {
                log.warn("No userId in event for orderId={} — cannot resolve user details", orderId);
                return new UserDto(null, "unknown", "unknown@scm-platform.com", null);
            }
        }
        try {
            long id = Long.parseLong(userId.trim());
            return userClient.getUserById(id);
        } catch (NumberFormatException ex) {
            String fallbackUserId = resolveUserIdFromOrder(orderId);
            if (fallbackUserId != null && !fallbackUserId.equals(userId)) {
                return resolveUser(fallbackUserId, null);
            }
            log.warn("userId '{}' is not a numeric ID — skipping user lookup", userId);
        } catch (Exception ex) {
            log.warn("Could not fetch user details for userId={}: {}", userId, ex.getMessage());
        }
        return new UserDto(null, "unknown", "unknown@scm-platform.com", null);
    }

    private String resolveUserIdFromOrder(Long orderId) {
        if (orderId == null) {
            return null;
        }
        try {
            OrderLookupResponse order = orderClient.getOrderById(orderId);
            return order != null ? order.userId() : null;
        } catch (Exception ex) {
            log.warn("Could not fetch order details for orderId={}: {}", orderId, ex.getMessage());
            return null;
        }
    }

    private byte[] tryGenerateReceipt(OrderCreatedEvent event) {
        try {
            OrderReceiptRequest request = new OrderReceiptRequest(
                    event.orderId(),
                    event.userId(),
                    event.shippingAddress(),
                    event.status(),
                    event.referenceNumber(),
                    event.createdAt(),
                    event.items()
            );
            return documentClient.generateOrderReceipt(request);
        } catch (Exception ex) {
            log.warn("Receipt generation failed for Order #{}, continuing without PDF: {}",
                    event.orderId(), ex.getMessage());
            return null;
        }
    }

    private void fanOut(NotificationContext context, Consumer<NotificationSender> action) {
        log.info("Dispatching notification for Order #{} to {} channel(s) for user {}",
                context.orderId(), senders.size(), context.user().userId());

        List<String> failures = senders.stream()
                .map(sender -> attempt(sender, action))
                .flatMap(Optional::stream)
                .toList();

        if (!failures.isEmpty()) {
            log.error("Notification dispatch partially failed for Order #{} on channels: {}",
                    context.orderId(), failures);
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
