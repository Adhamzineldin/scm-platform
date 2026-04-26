package com.scm.shipment_service.service;

import com.scm.shipment_service.entity.Shipment;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;

@Service
public class CarrierService {

    private static final String[] CARRIERS = {"FedEx", "UPS", "DHL", "USPS"};
    private final Random random = new Random();

    public Map<String, String> send(Shipment s) {
        String carrier = CARRIERS[random.nextInt(CARRIERS.length)];
        String trackingNumber = carrier.substring(0, 3).toUpperCase() +
                System.currentTimeMillis() +
                String.format("%04d", random.nextInt(10000));

        return Map.of(
                "trackingNumber", trackingNumber,
                "carrier", carrier
        );
    }
}
