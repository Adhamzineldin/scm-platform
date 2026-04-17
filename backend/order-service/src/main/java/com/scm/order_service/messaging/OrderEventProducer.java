package com.scm.order_service.messaging;

import com.scm.order_service.dto.messaging.OrderCreatedEvent;
import com.scm.order_service.dto.messaging.OrderItemPayload;
import com.scm.order_service.dto.messaging.OrderReadyForDispatchEvent;
import com.scm.order_service.dto.orders.OrderResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

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

   
    private <T> void sendMessage(String topic, T payload) {
        Message<T> message = MessageBuilder
                .withPayload(payload)
                .setHeader(KafkaHeaders.TOPIC, topic)
                .build();

        kafkaTemplate.send(message);
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
                response.getUserId(),
                response.getShippingAddress(),
                response.getStatus().name(),
                response.getIdempotencyKey(),
                response.getCreatedAt() != null ? response.getCreatedAt().toString() : Instant.now().toString(),
                itemPayloads
        );
    }
}