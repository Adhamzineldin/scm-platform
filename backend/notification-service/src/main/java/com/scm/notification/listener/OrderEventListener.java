package com.scm.notification.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scm.notification.dto.OrderCreatedEvent;
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
public class OrderEventListener {

    private static final String TOPIC = "order-created-topic";
    private static final String GROUP_ID = "notification-service-confirmation-group";
    private final NotificationDispatcher notificationDispatcher;
    private final ObjectMapper objectMapper; // Spring provides this automatically
    private final NotificationStreamRegistry registry;

    @RetryableTopic(
            attempts = "4",
            backOff = @BackOff(delay = 2000, multiplier = 2.0, maxDelay = 10000),
            dltStrategy = DltStrategy.FAIL_ON_ERROR
    )
    @KafkaListener(topics = TOPIC, groupId = GROUP_ID)
    public void handleOrderCreated(Map<String, Object> eventMap) {
        OrderCreatedEvent event = objectMapper.convertValue(eventMap, OrderCreatedEvent.class);

        registry.recordKafkaEvent(new NotificationKafkaEventState(
                "ORDER_CREATED",
                TOPIC,
                GROUP_ID,
                event.orderId(),
                event.userId(),
                "Order #" + event.orderId() + " created with status " + event.status(),
                event.createdAt(),
                Instant.now()
        ));

        log.info("Received OrderCreatedEvent for Order #{}", event.orderId());
        notificationDispatcher.dispatchOrderConfirmation(event);
    }

    @DltHandler
    public void handleDeadLetter(Map<String, Object> eventMap,
                                 @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
                                 @Header(KafkaHeaders.EXCEPTION_MESSAGE) String errorMessage) {
        log.error("DLT [{}]: Order confirmation permanently failed. Reason: {}",
                topic, errorMessage);
    }
}