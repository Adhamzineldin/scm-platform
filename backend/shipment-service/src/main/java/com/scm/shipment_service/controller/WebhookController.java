package com.scm.shipment_service.controller;

import com.scm.shipment_service.dto.WebhookRequest;
import com.scm.shipment_service.service.ShipmentService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shipments/webhooks")
public class WebhookController {

    private final ShipmentService service;

    public WebhookController(ShipmentService service) {
        this.service = service;
    }

    @PostMapping("/shipment-update")
    public String update(@RequestBody WebhookRequest req) {
        service.updateStatus(req.getTrackingNumber(), req.getStatus());
        return "OK";
    }
}