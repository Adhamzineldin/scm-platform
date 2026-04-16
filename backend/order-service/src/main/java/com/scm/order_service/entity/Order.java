package com.scm.order_service.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "orders")
@Data 
public class Order {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private Long id;
    
    private String sku;
    private Integer quantity;
    private String status; 
}