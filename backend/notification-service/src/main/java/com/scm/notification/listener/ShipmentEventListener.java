package com.scm.notification.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scm.notification.dto.ShipmentDispatchedEvent;
import com.scm.notification.service.NotificationDispatcher;
import com.scm.notification.stream.NotificationKafkaEventState;
import com.scm.notification.stream.NotificationStreamRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.BackOff;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.DltStrategy;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.time.Instant;

/**
 * Consumes {@code shipment-dispatched-topic} produced by shipment-service
 * after a successful auto-dispatch. Triggers an outbound tracking email +
 * realtime SSE push to the customer.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ShipmentEventListener {

    private static final String TOPIC = "shipment-dispatched-topic";
    private static final String GROUP_ID = "notification-service-shipment-group";

    private final NotificationDispatcher notificationDispatcher;
    private final ObjectMapper objectMapper;
    private final NotificationStreamRegistry registry;

    @RetryableTopic(
            attempts = "4",
            backOff = @BackOff(delay = 2000, multiplier = 2.0, maxDelay = 10000),
            dltStrategy = DltStrategy.FAIL_ON_ERROR
    )
    @KafkaListener(topics = TOPIC, groupId = GROUP_ID)
    public void handleShipmentDispatched(Map<String, Object> eventMap) {
        ShipmentDispatchedEvent event = objectMapper.convertValue(eventMap, ShipmentDispatchedEvent.class);

        registry.recordKafkaEvent(new NotificationKafkaEventState(
                "SHIPMENT_DISPATCHED",
                TOPIC,
                GROUP_ID,
                event.orderId(),
                event.userId(),
                "Shipment #" + event.shipmentId() + " for order #" + event.orderId()
                        + " updated to " + event.status()
                        + (event.trackingNumber() != null ? " (tracking " + event.trackingNumber() + ")" : ""),
                event.statusChangedAt() != null ? event.statusChangedAt() : event.dispatchedAt(),
                Instant.now()
        ));

        log.info("Received ShipmentDispatchedEvent for Order #{} (shipment={}, status={}, carrier={}, tracking={})",
                event.orderId(), event.shipmentId(), event.status(), event.carrier(), event.trackingNumber());
        notificationDispatcher.dispatchShipmentConfirmation(event);
    }

    @DltHandler
    public void handleDeadLetter(Map<String, Object> eventMap,
                                 @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
                                 @Header(KafkaHeaders.EXCEPTION_MESSAGE) String errorMessage) {
        log.error("DLT [{}]: Shipment dispatched notification permanently failed. Reason: {}",
                topic, errorMessage);
    }
}

