package com.scm.shipment_service.controller;

import com.scm.shipmentservice.dto.WebhookRequest;
import com.scm.shipmentservice.service.ShipmentService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webhooks")
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