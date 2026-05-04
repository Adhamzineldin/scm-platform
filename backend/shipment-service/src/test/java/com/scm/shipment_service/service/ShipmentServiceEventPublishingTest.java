package com.scm.shipment_service.service;

import com.scm.shipment_service.dto.ShipmentDispatchedEvent;
import com.scm.shipment_service.entity.Shipment;
import com.scm.shipment_service.model.ShipmentStatus;
import com.scm.shipment_service.repository.DispatchRecordRepository;
import com.scm.shipment_service.repository.ShipmentHistoryRepository;
import com.scm.shipment_service.repository.ShipmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShipmentServiceEventPublishingTest {

    @Mock
    private ShipmentRepository repo;
    @Mock
    private CarrierService carrier;
    @Mock
    private DispatchRecordRepository dispatchRepo;
    @Mock
    private ShipmentHistoryRepository historyRepo;
    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    private ShipmentService shipmentService;

    @BeforeEach
    void setUp() {
        shipmentService = new ShipmentService(repo, carrier, dispatchRepo, historyRepo, kafkaTemplate);
        when(repo.save(any(Shipment.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void autoDispatchPublishesShippedEvent() {
        Shipment shipment = new Shipment();
        shipment.setId(11L);
        shipment.setOrderId(101L);
        shipment.setUserId("1");
        shipment.setShippingAddress("123 Main St");
        shipment.setStatus(ShipmentStatus.PENDING);

        when(carrier.send(shipment)).thenReturn(Map.of(
                "trackingNumber", "TRK-1001",
                "carrier", "DHL"
        ));

        shipmentService.autoDispatch(shipment);

        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate).send(org.mockito.ArgumentMatchers.eq("shipment-dispatched-topic"), org.mockito.ArgumentMatchers.eq("11"), payloadCaptor.capture());

        ShipmentDispatchedEvent payload = (ShipmentDispatchedEvent) payloadCaptor.getValue();
        assertThat(payload.getStatus()).isEqualTo("SHIPPED");
        assertThat(payload.getDispatchedAt()).isNotBlank();
        assertThat(payload.getStatusChangedAt()).isNotBlank();
        assertThat(payload.getTrackingNumber()).isEqualTo("TRK-1001");
    }

    @Test
    void advanceStatusToDeliveredPublishesDeliveredEvent() {
        Shipment shipment = new Shipment();
        shipment.setId(12L);
        shipment.setOrderId(202L);
        shipment.setUserId("2");
        shipment.setShippingAddress("456 Broadway");
        shipment.setTrackingNumber("TRK-2002");
        shipment.setCarrier("UPS");
        shipment.setStatus(ShipmentStatus.IN_TRANSIT);

        when(repo.findById(12L)).thenReturn(Optional.of(shipment));

        shipmentService.advanceStatus(12L, ShipmentStatus.DELIVERED, "SYSTEM", "Delivered to customer");

        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate).send(org.mockito.ArgumentMatchers.eq("shipment-dispatched-topic"), org.mockito.ArgumentMatchers.eq("12"), payloadCaptor.capture());

        ShipmentDispatchedEvent payload = (ShipmentDispatchedEvent) payloadCaptor.getValue();
        assertThat(payload.getStatus()).isEqualTo("DELIVERED");
        assertThat(payload.getStatusChangedAt()).isNotBlank();
        assertThat(payload.getDispatchedAt()).isNull();
    }
}

