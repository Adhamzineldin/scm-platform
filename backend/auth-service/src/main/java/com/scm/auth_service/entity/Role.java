package com.scm.auth_service.entity;

public enum Role {
    /** Default low-privilege role assigned to all self-registered users. */
    STAFF,
    ADMIN,
    INVENTORY_MANAGER,
    ORDER_PROCESSING,
    WAREHOUSE_SPECIALIST,
    SHIPMENT_LEAD,
    CLOUD_ARCHITECT
}