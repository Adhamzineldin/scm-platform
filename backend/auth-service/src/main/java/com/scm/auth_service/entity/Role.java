package com.scm.auth_service.entity;

public enum Role {
    /** Default role assigned to all self-registered users. Can place orders. */
    CUSTOMER,
    STAFF,
    ADMIN,
    INVENTORY_MANAGER,
    ORDER_PROCESSING,
    WAREHOUSE_SPECIALIST,
    SHIPMENT_LEAD,
    CLOUD_ARCHITECT
}