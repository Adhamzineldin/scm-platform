package com.scm.warehouse_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "item_movements")
@Getter
@Setter
public class ItemMovement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sku;

    @Column(nullable = false)
    private Integer quantity;

    private String fromZoneCode;
    private String fromShelfCode;

    @Column(nullable = false)
    private String toZoneCode;

    private String toShelfCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MovementType movementType;

    private Long taskId;

    @Column(nullable = false)
    private String performedBy;

    @Column(nullable = false)
    private LocalDateTime movedAt;

    @PrePersist
    void onCreate() {
        movedAt = LocalDateTime.now();
    }
}
