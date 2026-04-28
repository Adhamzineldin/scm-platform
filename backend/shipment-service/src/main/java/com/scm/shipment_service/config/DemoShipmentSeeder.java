package com.scm.shipment_service.config;

import com.scm.shipment_service.entity.DispatchRecord;
import com.scm.shipment_service.entity.Shipment;
import com.scm.shipment_service.entity.ShipmentHistory;
import com.scm.shipment_service.model.ShipmentStatus;
import com.scm.shipment_service.repository.DispatchRecordRepository;
import com.scm.shipment_service.repository.ShipmentHistoryRepository;
import com.scm.shipment_service.repository.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Seeds shipments for the 3 DISPATCHED demo orders created in order-service.
 *
 * Relies on order-service DemoOrderSeeder creating orders with predictable IDs:
 *   Order 5 (alice)  → FedEx SHIPPED
 *   Order 6 (bob)    → UPS IN_TRANSIT
 *   Order 7 (carol)  → DHL DELIVERED + DispatchRecord + ShipmentHistory
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DemoShipmentSeeder implements CommandLineRunner {

    private final ShipmentRepository shipmentRepository;
    private final DispatchRecordRepository dispatchRepo;
    private final ShipmentHistoryRepository historyRepo;

    @Override
    public void run(String... args) {
        if (shipmentRepository.count() > 0) {
            log.info("[DemoShipmentSeeder] Shipments already present — skipping.");
            return;
        }

        LocalDateTime base = LocalDateTime.now().minusDays(8);

        // --- Order 5: FedEx, SHIPPED ---
        Shipment s1 = buildShipment(5L, "2", "TRK-2024-FDX-001", "FedEx",
                "12 Maple St, Cairo, EG", ShipmentStatus.SHIPPED, base);
        Shipment saved1 = shipmentRepository.save(s1);
        addHistory(saved1, null, ShipmentStatus.SHIPPED, base, "henry.shipment",
                "FedEx Warehouse, Nasr City", "Parcel handed to FedEx driver");

        // --- Order 6: UPS, IN_TRANSIT ---
        Shipment s2 = buildShipment(6L, "3", "TRK-2024-UPS-002", "UPS",
                "88 Nile Ave, Alexandria, EG", ShipmentStatus.IN_TRANSIT, base.plusDays(1));
        Shipment saved2 = shipmentRepository.save(s2);
        addHistory(saved2, null,                ShipmentStatus.SHIPPED,    base.plusDays(1),           "henry.shipment", "UPS Hub, Cairo",       "Parcel accepted by UPS");
        addHistory(saved2, ShipmentStatus.SHIPPED, ShipmentStatus.IN_TRANSIT, base.plusDays(2).plusHours(6), "ups.system",     "UPS Hub, Alexandria",  "Parcel in transit to delivery address");

        // --- Order 7: DHL, DELIVERED + DispatchRecord ---
        Shipment s3 = buildShipment(7L, "4", "TRK-2024-DHL-003", "DHL",
                "7 Sphinx Rd, Giza, EG", ShipmentStatus.DELIVERED, base.plusDays(2));
        Shipment saved3 = shipmentRepository.save(s3);
        addHistory(saved3, null,                   ShipmentStatus.SHIPPED,    base.plusDays(2),            "henry.shipment", "DHL Depot, Giza",      "Parcel collected by DHL");
        addHistory(saved3, ShipmentStatus.SHIPPED,    ShipmentStatus.IN_TRANSIT, base.plusDays(3),            "dhl.system",     "DHL Hub, Cairo",       "Parcel out for delivery");
        addHistory(saved3, ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED,  base.plusDays(4).plusHours(10), "dhl.system",  "7 Sphinx Rd, Giza",    "Delivered — signed by C. Smith");

        DispatchRecord dr = new DispatchRecord();
        dr.setShipment(saved3);
        dr.setDispatchedAt(base.plusDays(2));
        dr.setCarrierName("DHL Express");
        dr.setCarrierReference("TRK-2024-DHL-003");
        dr.setPickupLocation("DHL Depot, Giza Industrial Zone");
        dr.setDeliveryAddress("7 Sphinx Rd, Giza, EG");
        dr.setNotes("Fragile — handle with care. Signature required.");
        dispatchRepo.save(dr);

        log.warn("================================================================");
        log.warn(" [DemoShipmentSeeder] Seeded 3 demo shipments");
        log.warn("   Order #5 → FedEx TRK-2024-FDX-001  (SHIPPED)");
        log.warn("   Order #6 → UPS   TRK-2024-UPS-002  (IN_TRANSIT)");
        log.warn("   Order #7 → DHL   TRK-2024-DHL-003  (DELIVERED)");
        log.warn("================================================================");
    }

    private Shipment buildShipment(Long orderId, String userId, String tracking,
                                   String carrier, String address, ShipmentStatus status,
                                   LocalDateTime createdAt) {
        Shipment s = new Shipment();
        s.setOrderId(orderId);
        s.setUserId(userId);
        s.setTrackingNumber(tracking);
        s.setCarrier(carrier);
        s.setShippingAddress(address);
        s.setStatus(status);
        s.setCreatedAt(createdAt);
        s.setUpdatedAt(createdAt);
        s.setCreatedBy("henry.shipment");
        s.setUpdatedBy("henry.shipment");
        return s;
    }

    private void addHistory(Shipment shipment, ShipmentStatus prev, ShipmentStatus next,
                            LocalDateTime at, String by, String location, String description) {
        ShipmentHistory h = new ShipmentHistory();
        h.setShipment(shipment);
        h.setPreviousStatus(prev);
        h.setNewStatus(next);
        h.setChangedAt(at);
        h.setChangedBy(by);
        h.setLocation(location);
        h.setDescription(description);
        h.setCreatedAt(at);
        h.setUpdatedAt(at);
        historyRepo.save(h);
    }
}
