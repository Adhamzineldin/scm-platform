package com.scm.shipment_service.audit;

import com.scm.shipment_service.entity.BaseEntity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.LocalDateTime;

public class AuditListener {

    @PrePersist
    public void prePersist(Object obj) {
        if (obj instanceof BaseEntity e) {
            e.setCreatedAt(LocalDateTime.now());
        }
    }

    @PreUpdate
    public void preUpdate(Object obj) {
        if (obj instanceof BaseEntity e) {
            e.setUpdatedAt(LocalDateTime.now());
        }
    }
}