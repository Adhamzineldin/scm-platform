package com.scm.warehouse_service.config;

import com.scm.warehouse_service.entity.SkuLocation;
import com.scm.warehouse_service.entity.WarehouseZone;
import com.scm.warehouse_service.entity.ZoneType;
import com.scm.warehouse_service.repository.SkuLocationRepository;
import com.scm.warehouse_service.repository.WarehouseZoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds warehouse zones and SKU locations for the full demo.
 * Zones are seeded first, then SKU locations reference them.
 * @Order(1) ensures SchemaPatcher (@Order(0)) runs first.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
public class DataInitializer implements ApplicationRunner {

    private final WarehouseZoneRepository zoneRepository;
    private final SkuLocationRepository skuLocationRepository;

    private record ZoneSeed(String code, String name, ZoneType type, String description) {}

    private static final List<ZoneSeed> DEFAULT_ZONES = List.of(
        new ZoneSeed("RCV-01",  "Receiving Dock",    ZoneType.RECEIVING, "Inbound goods receiving area"),
        new ZoneSeed("STOR-01", "Main Storage",      ZoneType.STORAGE,   "Primary bulk storage area"),
        new ZoneSeed("PICK-01", "Picking Area",      ZoneType.PICKING,   "Order picking staging area"),
        new ZoneSeed("PACK-01", "Packing Station",   ZoneType.PACKING,   "Order packing and sealing area"),
        new ZoneSeed("SHIP-01", "Shipping Dock",     ZoneType.SHIPPING,  "Outbound shipment loading area"),
        new ZoneSeed("STG-01",  "Staging Zone",      ZoneType.STAGING,   "Pre-dispatch staging area")
    );

    private record SkuSeed(String sku, String zoneCode, String shelf, int qty) {}

    private static final List<SkuSeed> SKU_LOCATIONS = List.of(
        new SkuSeed("LAPTOP-001",   "STOR-01", "A-01", 45),
        new SkuSeed("PHONE-001",    "STOR-01", "A-02", 80),
        new SkuSeed("TABLET-001",   "STOR-01", "A-03", 60),
        new SkuSeed("HEADSET-001",  "STOR-01", "A-04", 120),
        new SkuSeed("KEYBOARD-001", "STOR-01", "B-01", 95),
        new SkuSeed("MOUSE-001",    "STOR-01", "B-02", 150),
        new SkuSeed("MONITOR-001",  "STOR-01", "B-03", 35),
        new SkuSeed("WEBCAM-001",   "STOR-01", "B-04", 75),
        new SkuSeed("SSD-001",      "STOR-01", "C-01", 200),
        new SkuSeed("CABLE-001",    "STOR-01", "C-02", 300),
        new SkuSeed("CHAIR-001",    "STOR-01", "C-03", 25),
        new SkuSeed("DESK-001",     "STOR-01", "C-04", 15),
        new SkuSeed("BAG-001",      "STOR-01", "D-01", 100),
        new SkuSeed("SPEAKER-001",  "STOR-01", "D-02", 90),
        new SkuSeed("CAMERA-001",   "STOR-01", "D-03", 20)
    );

    @Override
    public void run(ApplicationArguments args) {
        seedZones();
        seedSkuLocations();
    }

    private void seedZones() {
        for (ZoneSeed seed : DEFAULT_ZONES) {
            if (!zoneRepository.existsByCodeIgnoreCase(seed.code())) {
                WarehouseZone zone = new WarehouseZone();
                zone.setCode(seed.code());
                zone.setName(seed.name());
                zone.setType(seed.type());
                zone.setDescription(seed.description());
                zoneRepository.save(zone);
                log.info("[DataInitializer] Seeded zone: {} ({})", seed.code(), seed.name());
            }
        }
    }

    private void seedSkuLocations() {
        if (skuLocationRepository.count() > 0) {
            log.info("[DataInitializer] SKU locations already present — skipping.");
            return;
        }

        WarehouseZone storageZone = zoneRepository.findByCodeIgnoreCase("STOR-01")
                .orElseThrow(() -> new IllegalStateException("STOR-01 zone not found after seeding"));

        for (SkuSeed seed : SKU_LOCATIONS) {
            SkuLocation loc = new SkuLocation();
            loc.setSku(seed.sku());
            loc.setZone(storageZone);
            loc.setShelfCode(seed.shelf());
            loc.setOnHandQuantity(seed.qty());
            skuLocationRepository.save(loc);
        }

        log.info("[DataInitializer] Seeded {} SKU locations in STOR-01.", SKU_LOCATIONS.size());
    }
}
