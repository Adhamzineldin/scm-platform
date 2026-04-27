package com.scm.shipment_service.repository;
import com.scm.shipment_service.entity.ShipmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ShipmentHistoryRepository extends JpaRepository<ShipmentHistory, Long> {
    List<ShipmentHistory> findByShipmentIdOrderByChangedAtDesc(Long shipmentId);
}