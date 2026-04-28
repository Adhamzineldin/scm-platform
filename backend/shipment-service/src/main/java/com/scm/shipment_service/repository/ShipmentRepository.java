package com.scm.shipment_service.repository;
import com.scm.shipment_service.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    Optional<Shipment> findByTrackingNumber(String trackingNumber);
    Optional<Shipment> findFirstByOrderIdOrderByIdDesc(Long orderId);
}
