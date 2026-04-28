package com.scm.order_service.config;

import com.scm.order_service.entity.Order;
import com.scm.order_service.entity.OrderItem;
import com.scm.order_service.entity.OrderStatusHistory;
import com.scm.order_service.enums.OrderStatus;
import com.scm.order_service.repository.OrderRepository;
import com.scm.order_service.repository.OrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Seeds demo orders covering every order status so the full workflow is visible.
 *
 * User IDs are predictable because auth-service uses ddl-auto=create and seeds
 * users in fixed order:
 *   2=alice, 3=bob, 4=carol, 5=david (CUSTOMER)
 *   8=grace.warehouse (WAREHOUSE_SPECIALIST), 9=henry.shipment (SHIPMENT_LEAD)
 *
 * Order IDs (predictable with ddl-auto=create + seeding in fixed order):
 *   1  alice   VALIDATED   waiting for warehouse picking
 *   2  bob     VALIDATED   waiting for warehouse picking
 *   3  carol   PICKED      picked, ready for dispatch
 *   4  david   PICKED      picked, ready for dispatch
 *   5  alice   DISPATCHED  in transit (shipment SHIPPED)
 *   6  bob     DISPATCHED  in transit (shipment IN_TRANSIT)
 *   7  carol   DISPATCHED  delivered  (shipment DELIVERED)
 *   8  alice   CANCELLED   cancelled before picking
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DemoOrderSeeder implements CommandLineRunner {

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository historyRepository;

    @Override
    public void run(String... args) {
        if (orderRepository.count() > 0) {
            log.info("[DemoOrderSeeder] Orders already present — skipping.");
            return;
        }

        LocalDateTime base = LocalDateTime.now().minusDays(14);

        // Order 1: alice, VALIDATED
        Order o1 = buildOrder("2", "12 Maple St, Cairo, EG", OrderStatus.VALIDATED);
        addItem(o1, "LAPTOP-001",   1, new BigDecimal("1299.99"));
        addItem(o1, "CABLE-001",    2, new BigDecimal("39.99"));
        Long id1 = orderRepository.save(o1).getId();
        history(id1, null,        "VALIDATED", base,                      "system",          "Order validated — inventory reserved");

        // Order 2: bob, VALIDATED
        Order o2 = buildOrder("3", "88 Nile Ave, Alexandria, EG", OrderStatus.VALIDATED);
        addItem(o2, "PHONE-001",    1, new BigDecimal("799.99"));
        addItem(o2, "HEADSET-001",  1, new BigDecimal("149.99"));
        addItem(o2, "BAG-001",      1, new BigDecimal("69.99"));
        Long id2 = orderRepository.save(o2).getId();
        history(id2, null,        "VALIDATED", base.plusDays(1),           "system",          "Order validated — inventory reserved");

        // Order 3: carol, PICKED
        Order o3 = buildOrder("4", "7 Sphinx Rd, Giza, EG", OrderStatus.PICKED);
        addItem(o3, "KEYBOARD-001", 1, new BigDecimal("89.99"));
        addItem(o3, "MOUSE-001",    1, new BigDecimal("59.99"));
        Long id3 = orderRepository.save(o3).getId();
        history(id3, null,        "VALIDATED", base.plusDays(2),           "system",          "Order validated — inventory reserved");
        history(id3, "VALIDATED", "PICKED",    base.plusDays(3),           "grace.warehouse", "Items picked from STOR-01");

        // Order 4: david, PICKED
        Order o4 = buildOrder("5", "3 Pyramid Blvd, Giza, EG", OrderStatus.PICKED);
        addItem(o4, "MONITOR-001",  1, new BigDecimal("449.99"));
        Long id4 = orderRepository.save(o4).getId();
        history(id4, null,        "VALIDATED", base.plusDays(3),           "system",          "Order validated — inventory reserved");
        history(id4, "VALIDATED", "PICKED",    base.plusDays(4),           "grace.warehouse", "Items picked from STOR-01, shelf B-03");

        // Order 5: alice, DISPATCHED → FedEx SHIPPED
        Order o5 = buildOrder("2", "12 Maple St, Cairo, EG", OrderStatus.DISPATCHED);
        addItem(o5, "TABLET-001",   1, new BigDecimal("499.99"));
        addItem(o5, "WEBCAM-001",   1, new BigDecimal("129.99"));
        addItem(o5, "CABLE-001",    1, new BigDecimal("39.99"));
        Long id5 = orderRepository.save(o5).getId();
        history(id5, null,        "VALIDATED",  base.plusDays(4),          "system",          "Order validated — inventory reserved");
        history(id5, "VALIDATED", "PICKED",     base.plusDays(5),          "grace.warehouse", "Items picked from STOR-01");
        history(id5, "PICKED",    "DISPATCHED", base.plusDays(6),          "henry.shipment",  "Handed to FedEx — TRK-2024-FDX-001");

        // Order 6: bob, DISPATCHED → UPS IN_TRANSIT
        Order o6 = buildOrder("3", "88 Nile Ave, Alexandria, EG", OrderStatus.DISPATCHED);
        addItem(o6, "SSD-001",      2, new BigDecimal("119.99"));
        addItem(o6, "SPEAKER-001",  1, new BigDecimal("89.99"));
        Long id6 = orderRepository.save(o6).getId();
        history(id6, null,        "VALIDATED",  base.plusDays(5),          "system",          "Order validated — inventory reserved");
        history(id6, "VALIDATED", "PICKED",     base.plusDays(6),          "grace.warehouse", "Items picked from STOR-01");
        history(id6, "PICKED",    "DISPATCHED", base.plusDays(7),          "henry.shipment",  "Handed to UPS — TRK-2024-UPS-002");

        // Order 7: carol, DISPATCHED → DHL DELIVERED
        Order o7 = buildOrder("4", "7 Sphinx Rd, Giza, EG", OrderStatus.DISPATCHED);
        addItem(o7, "CHAIR-001",    1, new BigDecimal("399.99"));
        addItem(o7, "CABLE-001",    3, new BigDecimal("39.99"));
        Long id7 = orderRepository.save(o7).getId();
        history(id7, null,        "VALIDATED",  base.plusDays(6),          "system",          "Order validated — inventory reserved");
        history(id7, "VALIDATED", "PICKED",     base.plusDays(7),          "grace.warehouse", "Items picked from STOR-01, shelf C-03");
        history(id7, "PICKED",    "DISPATCHED", base.plusDays(8),          "henry.shipment",  "Handed to DHL — TRK-2024-DHL-003");

        // Order 8: alice, CANCELLED
        Order o8 = buildOrder("2", "12 Maple St, Cairo, EG", OrderStatus.CANCELLED);
        addItem(o8, "DESK-001",     1, new BigDecimal("599.99"));
        Long id8 = orderRepository.save(o8).getId();
        history(id8, null,        "VALIDATED",  base.plusDays(7),          "system",          "Order validated — inventory reserved");
        history(id8, "VALIDATED", "CANCELLED",  base.plusDays(7).plusHours(2), "alice",       "Customer requested cancellation");

        log.warn("================================================================");
        log.warn(" [DemoOrderSeeder] Seeded 8 demo orders across all statuses");
        log.warn("   #1-2 VALIDATED  (alice, bob)");
        log.warn("   #3-4 PICKED     (carol, david)");
        log.warn("   #5   DISPATCHED alice  → FedEx TRK-2024-FDX-001 (SHIPPED)");
        log.warn("   #6   DISPATCHED bob    → UPS   TRK-2024-UPS-002 (IN_TRANSIT)");
        log.warn("   #7   DISPATCHED carol  → DHL   TRK-2024-DHL-003 (DELIVERED)");
        log.warn("   #8   CANCELLED  alice");
        log.warn("================================================================");
    }

    private Order buildOrder(String userId, String address, OrderStatus status) {
        Order o = new Order();
        o.setUserId(userId);
        o.setShippingAddress(address);
        o.setStatus(status);
        o.setIdempotencyKey(UUID.randomUUID().toString());
        return o;
    }

    private void addItem(Order order, String sku, int qty, BigDecimal unitPrice) {
        OrderItem item = new OrderItem();
        item.setSku(sku);
        item.setQuantity(qty);
        item.setUnitPrice(unitPrice);
        order.addItem(item);
    }

    private void history(Long orderId, String prev, String next, LocalDateTime at, String by, String note) {
        historyRepository.save(new OrderStatusHistory(orderId, prev, next, at, by, note));
    }
}
