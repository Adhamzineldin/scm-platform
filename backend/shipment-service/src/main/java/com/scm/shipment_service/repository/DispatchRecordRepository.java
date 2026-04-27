package com.scm.shipment_service.repository;
import com.scm.shipment_service.entity.DispatchRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DispatchRecordRepository extends JpaRepository<DispatchRecord, Long> {
    List<DispatchRecord> findByShipmentId(Long shipmentId);
    Optional<DispatchRecord> findTopByShipmentIdOrderByDispatchedAtDesc(Long shipmentId);
}