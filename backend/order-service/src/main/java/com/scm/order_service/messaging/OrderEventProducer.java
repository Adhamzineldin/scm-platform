package com.scm.order_service.messaging;

import com.scm.order_service.dto.messaging.OrderCreatedEvent;
import com.scm.order_service.dto.messaging.OrderItemPayload;
import com.scm.order_service.dto.messaging.OrderReadyForDispatchEvent;
import com.scm.order_service.dto.messaging.OrderStatusChangedEvent;
import com.scm.order_service.dto.orders.OrderResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendOrderCreatedEvent(OrderResponse orderResponse) {
        log.info("Mapping and publishing Order Created Event for Order ID: {}", orderResponse.getId());

        OrderCreatedEvent eventPayload = mapToEvent(orderResponse);
        sendMessage("order-created-topic", eventPayload);
    }

    public void sendOrderReadyForDispatchEvent(OrderReadyForDispatchEvent event) {
        log.info("Publishing event: Order ID {} is packed and ready for external dispatch", event.getOrderId());

        sendMessage("order-ready-for-dispatch-topic", event);
    }

    public void sendOrderStatusChangedEvent(Long orderId, String userId, String previousStatus, String newStatus) {
        log.info("Publishing status change for Order #{}: {} -> {}", orderId, previousStatus, newStatus);

        OrderStatusChangedEvent event = new OrderStatusChangedEvent(
                orderId,
                userId,
                previousStatus,
                newStatus,
                Instant.now().toString()
        );
        sendMessage("order-status-changed-topic", event);
    }

    private <T> void sendMessage(String topic, T payload) {
        try {
            var result = kafkaTemplate.send(topic, payload).get(5, TimeUnit.SECONDS);
            log.info("Published to topic '{}' partition={} offset={}",
                    topic, result.getRecordMetadata().partition(), result.getRecordMetadata().offset());
        } catch (Exception ex) {
            log.error("FAILED to publish to Kafka topic '{}': {}", topic, ex.getMessage(), ex);
        }
    }

    
    private OrderCreatedEvent mapToEvent(OrderResponse response) {
        List<OrderItemPayload> itemPayloads = response.getItems().stream()
                .map(item -> new OrderItemPayload(
                        item.getSku(),
                        item.getQuantity(),
                        item.getUnitPrice()
                )).toList();

        return new OrderCreatedEvent(
                response.getId(),
                response.getReferenceNumber(),
                response.getUserId(),
                response.getShippingAddress(),
                response.getStatus().name(),
                response.getIdempotencyKey(),
                response.getCreatedAt() != null ? response.getCreatedAt().toString() : Instant.now().toString(),
                itemPayloads
        );
    }
}