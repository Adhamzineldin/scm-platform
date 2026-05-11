package com.scm.notification.service.realtime;

import com.scm.notification.dto.OrderConfirmationContext;
import com.scm.notification.dto.ShipmentDispatchedContext;
import com.scm.notification.dto.StatusUpdateContext;
import com.scm.notification.service.NotificationSender;
import com.scm.notification.stream.InAppNotification;
import com.scm.notification.stream.NotificationStreamRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RealtimeNotificationSender implements NotificationSender {

    private static final String CHANNEL = "REALTIME";

    private final NotificationStreamRegistry registry;

    @Override
    public String channel() {
        return CHANNEL;
    }

    @Override
    public void sendOrderConfirmation(OrderConfirmationContext context) {
        String userId = context.user().userId();
        InAppNotification payload = InAppNotification.orderConfirmed(
                context.event().orderId(), userId
        );
        log.info("Pushing realtime ORDER_CONFIRMED for Order #{} to userId={}",
                context.event().orderId(), userId);
        registry.publish(userId, payload);
    }

    @Override
    public void sendStatusUpdate(StatusUpdateContext context) {
        String userId = context.user().userId();
        InAppNotification payload = InAppNotification.statusUpdate(
                context.event().orderId(), userId, context.event().newStatus()
        );
        log.info("Pushing realtime ORDER_STATUS_UPDATED for Order #{} to userId={}",
                context.event().orderId(), userId);
        registry.publish(userId, payload);
    }

    @Override
    public void sendShipmentDispatched(ShipmentDispatchedContext context) {
        String userId = context.targetUserId() != null && !context.targetUserId().isBlank()
                ? context.targetUserId()
                : context.user().userId();
        String status = context.event().status() != null ? context.event().status() : "SHIPPED";
        InAppNotification payload = InAppNotification.shipmentStatusUpdated(
                context.event().orderId(),
                userId,
                status,
                context.event().trackingNumber(),
                context.event().carrier()
        );
        log.info("Pushing realtime shipment status {} for Order #{} to userId={} (tracking={})",
                status, context.event().orderId(), userId, context.event().trackingNumber());
        registry.publish(userId, payload);
    }
}
