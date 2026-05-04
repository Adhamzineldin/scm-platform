package com.scm.shipment_service.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scm.shipment_service.dto.OrderReadyForDispatchEvent;
import com.scm.shipment_service.entity.Shipment;
import com.scm.shipment_service.service.ShipmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Closes the order workflow loop:
 * Consumes {@code order-ready-for-dispatch-topic} from order-service, auto-creates and
 * dispatches a shipment. ShipmentService publishes shipment status notifications.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ShipmentEventListener {

    private static final String INBOUND_TOPIC = "order-ready-for-dispatch-topic";
    private final ShipmentService shipmentService;
    private final ObjectMapper objectMapper;

    @RetryableTopic(attempts = "4")
    @KafkaListener(topics = INBOUND_TOPIC, groupId = "shipment-service-group")
    public void handleOrderReadyForDispatch(Map<String, Object> eventMap) {
        OrderReadyForDispatchEvent event = objectMapper.convertValue(eventMap, OrderReadyForDispatchEvent.class);
        log.info("Auto-dispatch flow starting for Order #{} (user={})", event.getOrderId(), event.getUserId());

        Shipment created = shipmentService.createForOrder(
                event.getOrderId(),
                event.getUserId(),
                event.getShippingAddress()
        );
        shipmentService.autoDispatch(created);
    }

    @DltHandler
    public void handleDeadLetter(Map<String, Object> eventMap,
                                 @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
                                 @Header(KafkaHeaders.EXCEPTION_MESSAGE) String errorMessage) {
        log.error("DLT [{}]: Shipment auto-dispatch permanently failed. Reason: {}. Payload: {}",
                topic, errorMessage, eventMap);
    }
}

