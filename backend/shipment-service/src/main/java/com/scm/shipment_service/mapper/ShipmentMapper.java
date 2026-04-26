package com.scm.shipment_service.mapper;

import com.scm.shipment_service.dto.ShipmentResponse;
import com.scm.shipment_service.entity.Shipment;

public class ShipmentMapper {

    public static ShipmentResponse toResponse(Shipment s) {
        ShipmentResponse r = new ShipmentResponse();
        r.setId(s.getId());
        r.setTrackingNumber(s.getTrackingNumber());
        r.setStatus((s.getStatus() != null) ? String.valueOf(s.getStatus().name()) : null);
        return r;
    }
}