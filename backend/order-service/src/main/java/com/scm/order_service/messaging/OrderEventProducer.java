package com.scm.order_service.messaging;

import com.scm.order_service.dto.messaging.OrderReadyForDispatchEvent;
import com.scm.order_service.dto.orders.OrderResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderEventProducer {

    private final KafkaTemplate<String, OrderResponse> kafkaTemplate;

    public void sendOrderCreatedEvent(OrderResponse orderResponse) {
        log.info("Sending Order Created Event for Order ID: {}", orderResponse.getId());

        Message<OrderResponse> message = MessageBuilder
                .withPayload(orderResponse)
                .setHeader(KafkaHeaders.TOPIC, "order-created-topic")
                .build();

        kafkaTemplate.send(message);
    }

    public void sendOrderReadyForDispatchEvent(OrderReadyForDispatchEvent event) {
        log.info("Publishing event: Order ID {} is packed and ready for external dispatch", event.getOrderId());

        Message<OrderReadyForDispatchEvent> message = MessageBuilder
                .withPayload(event)
                .setHeader(KafkaHeaders.TOPIC, "order-ready-for-dispatch-topic")
                .build();

        kafkaTemplate.send(message); 
    }
}