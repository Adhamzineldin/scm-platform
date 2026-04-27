package com.scm.shipment_service.mapper;

import com.scm.shipment_service.dto.ShipmentResponse;
import com.scm.shipment_service.entity.Shipment;

public class ShipmentMapper {

    public static ShipmentResponse toResponse(Shipment s) {
        ShipmentResponse r = new ShipmentResponse();
        r.setId(s.getId());
        r.setOrderId(s.getOrderId());
        r.setUserId(s.getUserId());
        r.setTrackingNumber(s.getTrackingNumber());
        r.setCarrier(s.getCarrier());
        r.setShippingAddress(s.getShippingAddress());
        r.setStatus(s.getStatus() != null ? s.getStatus().name() : null);
        r.setCreatedAt(s.getCreatedAt());
        r.setUpdatedAt(s.getUpdatedAt());
        return r;
    }
}