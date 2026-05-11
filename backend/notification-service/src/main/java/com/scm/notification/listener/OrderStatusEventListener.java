package com.scm.notification.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scm.notification.dto.OrderStatusChangedEvent;
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

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderStatusEventListener {

    private static final String TOPIC = "order-status-changed-topic";
    private static final String GROUP_ID = "notification-service-status-group";
    private final NotificationDispatcher notificationDispatcher;
    private final ObjectMapper objectMapper;
    private final NotificationStreamRegistry registry;

    @RetryableTopic(
            attempts = "4",
            backOff = @BackOff(delay = 2000, multiplier = 2.0, maxDelay = 10000),
            dltStrategy = DltStrategy.FAIL_ON_ERROR
    )
    @KafkaListener(topics = TOPIC, groupId = GROUP_ID)
    public void handleStatusChanged(Map<String, Object> eventMap) {
        OrderStatusChangedEvent event = objectMapper.convertValue(eventMap, OrderStatusChangedEvent.class);

        registry.recordKafkaEvent(new NotificationKafkaEventState(
                "ORDER_STATUS_CHANGED",
                TOPIC,
                GROUP_ID,
                event.orderId(),
                event.userId(),
                "Order #" + event.orderId() + " changed from " + event.previousStatus() + " to " + event.newStatus(),
                event.changedAt(),
                Instant.now()
        ));

        log.info("Received OrderStatusChangedEvent for Order #{}: {} -> {}",
                event.orderId(), event.previousStatus(), event.newStatus());
        notificationDispatcher.dispatchStatusUpdate(event);
    }

    @DltHandler
    public void handleDeadLetter(Map<String, Object> eventMap,
                                 @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
                                 @Header(KafkaHeaders.EXCEPTION_MESSAGE) String errorMessage) {
        log.error("DLT [{}]: Status update notification permanently failed. Reason: {}",
                topic, errorMessage);
    }
}