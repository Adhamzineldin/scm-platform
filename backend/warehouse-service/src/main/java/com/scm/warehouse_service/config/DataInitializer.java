package com.scm.warehouse_service.config;

import com.scm.warehouse_service.entity.WarehouseZone;
import com.scm.warehouse_service.entity.ZoneType;
import com.scm.warehouse_service.repository.WarehouseZoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final WarehouseZoneRepository zoneRepository;

    private record ZoneSeed(String code, String name, ZoneType type, String description) {}

    private static final List<ZoneSeed> DEFAULT_ZONES = List.of(
        new ZoneSeed("RCV-01", "Receiving Dock",    ZoneType.RECEIVING, "Inbound goods receiving area"),
        new ZoneSeed("STOR-01","Main Storage",       ZoneType.STORAGE,   "Primary bulk storage area"),
        new ZoneSeed("PICK-01","Picking Area",       ZoneType.PICKING,   "Order picking staging area"),
        new ZoneSeed("PACK-01","Packing Station",    ZoneType.PACKING,   "Order packing and sealing area"),
        new ZoneSeed("SHIP-01","Shipping Dock",      ZoneType.SHIPPING,  "Outbound shipment loading area")
    );

    @Override
    public void run(ApplicationArguments args) {
        for (ZoneSeed seed : DEFAULT_ZONES) {
            if (!zoneRepository.existsByCodeIgnoreCase(seed.code())) {
                WarehouseZone zone = new WarehouseZone();
                zone.setCode(seed.code());
                zone.setName(seed.name());
                zone.setType(seed.type());
                zone.setDescription(seed.description());
                zoneRepository.save(zone);
                log.info("Seeded warehouse zone: {} ({})", seed.code(), seed.name());
            }
        }
    }
}
