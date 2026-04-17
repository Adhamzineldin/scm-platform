package com.scm.order_service.repository;

import com.scm.order_service.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Page<Order> findByUserId(String userId, Pageable pageable);
    Optional<Order> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey);
}