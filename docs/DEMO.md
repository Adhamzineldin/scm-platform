# SCM Platform — Demo Guide

> Every restart with `docker compose up --build` drops and recreates all schemas, then seeds fresh demo data. No manual DB setup required.

---

## Demo Accounts

| # | Username | Email | Password | Role |
|---|----------|-------|----------|------|
| 1 | admin | admin@scm.local | `Admin@12345` | ADMIN |
| 2 | alice | alice@demo.com | `Demo@12345` | CUSTOMER |
| 3 | bob | bob@demo.com | `Demo@12345` | CUSTOMER |
| 4 | carol | carol@demo.com | `Demo@12345` | CUSTOMER |
| 5 | david | david@demo.com | `Demo@12345` | CUSTOMER |
| 6 | eve.ops | eve@demo.com | `Demo@12345` | ORDER_PROCESSING |
| 7 | frank.inventory | frank@demo.com | `Demo@12345` | INVENTORY_MANAGER |
| 8 | grace.warehouse | grace@demo.com | `Demo@12345` | WAREHOUSE_SPECIALIST |
| 9 | henry.shipment | henry@demo.com | `Demo@12345` | SHIPMENT_LEAD |
| 10 | ivan.staff | ivan@demo.com | `Demo@12345` | STAFF |

All accounts are email-verified and can log in immediately (no OTP required for pre-seeded accounts).

---

## Pre-Seeded Products (15 SKUs)

| SKU | Name | Price | Stock | Location |
|-----|------|-------|-------|----------|
| LAPTOP-001 | Gaming Laptop 15" | $1,299.99 | 45 | STOR-01 / A-01 |
| PHONE-001 | Smartphone Pro Max | $799.99 | 80 | STOR-01 / A-02 |
| TABLET-001 | Tablet Air 11" | $499.99 | 60 | STOR-01 / A-03 |
| HEADSET-001 | Wireless Noise-Cancelling Headset | $149.99 | 120 | STOR-01 / A-04 |
| KEYBOARD-001 | Mechanical Keyboard TKL | $89.99 | 95 | STOR-01 / B-01 |
| MOUSE-001 | Ergonomic Wireless Mouse | $59.99 | 150 | STOR-01 / B-02 |
| MONITOR-001 | 4K 27" Monitor | $449.99 | 35 | STOR-01 / B-03 |
| WEBCAM-001 | 4K Webcam Pro | $129.99 | 75 | STOR-01 / B-04 |
| SSD-001 | Portable SSD 1TB | $119.99 | 200 | STOR-01 / C-01 |
| CABLE-001 | USB-C 7-in-1 Hub | $39.99 | 300 | STOR-01 / C-02 |
| CHAIR-001 | Ergonomic Office Chair | $399.99 | 25 | STOR-01 / C-03 |
| DESK-001 | Electric Standing Desk | $599.99 | 15 | STOR-01 / C-04 |
| BAG-001 | Laptop Backpack 15.6" | $69.99 | 100 | STOR-01 / D-01 |
| SPEAKER-001 | Bluetooth Speaker 360° | $89.99 | 90 | STOR-01 / D-02 |
| CAMERA-001 | Mirrorless Camera Kit | $899.99 | 20 | STOR-01 / D-03 |

---

## Pre-Seeded Orders

| Order # | Customer | Status | Items | Carrier / Tracking |
|---------|----------|--------|-------|-------------------|
| 1 | alice | **VALIDATED** | LAPTOP-001, CABLE-001 ×2 | — |
| 2 | bob | **VALIDATED** | PHONE-001, HEADSET-001, BAG-001 | — |
| 3 | carol | **PICKED** | KEYBOARD-001, MOUSE-001 | — |
| 4 | david | **PICKED** | MONITOR-001 | — |
| 5 | alice | **DISPATCHED** | TABLET-001, WEBCAM-001, CABLE-001 | FedEx `TRK-2024-FDX-001` — SHIPPED |
| 6 | bob | **DISPATCHED** | SSD-001 ×2, SPEAKER-001 | UPS `TRK-2024-UPS-002` — IN TRANSIT |
| 7 | carol | **DISPATCHED** | CHAIR-001, CABLE-001 ×3 | DHL `TRK-2024-DHL-003` — DELIVERED |
| 8 | alice | **CANCELLED** | DESK-001 | — |

Orders 3–7 have completed picking tasks assigned to `grace.warehouse`. Orders 5–7 have full shipment + dispatch records.

---

## Warehouse Zones

| Code | Name | Type |
|------|------|------|
| RCV-01 | Receiving Dock | RECEIVING |
| STOR-01 | Main Storage | STORAGE |
| PICK-01 | Picking Area | PICKING |
| PACK-01 | Packing Station | PACKING |
| SHIP-01 | Shipping Dock | SHIPPING |
| STG-01 | Staging Zone | STAGING |

---

## Demo Walkthrough

### 1. Customer Experience — login as **alice** (alice@demo.com / Demo@12345)

**My Orders**
- See orders #1, #5, #8 — covers VALIDATED, DISPATCHED, CANCELLED
- Open order #5: see the 4-step status progression bar (Validated → Picked → Dispatched)
- Timestamps per step show when each transition happened
- Shipment card shows FedEx tracking number, carrier, address
- Open order #7 (carol's — not visible to alice, only admins see all)

**Shop → Cart → Checkout**
1. Browse products on the Shop page
2. Add items to cart
3. Go to Cart → enter shipping address → "Proceed to payment"
4. Payment Gateway (card/bank transfer in sandbox mode)
5. Enter any card: `4242 4242 4242 4242`, expiry `12/26`, CVV `123`
6. Order is placed → order confirmation email sent → redirected to order detail
7. Status bubble shows VALIDATED

**Documents**
- Download PDF receipts for any past order

**2FA Registration (new user)**
1. Go to Register
2. Enter username, email, password → "Send verification code"
3. OTP arrives at the email address
4. Enter the 6-digit code → logged in with JWT

---

### 2. Admin — login as **admin** (admin@scm.local / Admin@12345)

- **User Management**: see all 10 demo accounts, change any user's role
- **All Orders**: see every order across all customers, not just own orders
- Full access to all areas of the dashboard

---

### 3. Inventory Manager — login as **frank.inventory** (frank@demo.com / Demo@12345)

- **Inventory**: view all 15 products with stock levels and reorder thresholds
- Add a new product with SKU, price, quantity
- Adjust stock quantities on existing products

---

### 4. Warehouse Specialist — login as **grace.warehouse** (grace@demo.com / Demo@12345)

**Warehouse page — Zones tab**
- See all 6 seeded zones (RCV-01, STOR-01, PICK-01, PACK-01, SHIP-01, STG-01)
- Create a new zone using the form (Code, Name, Type, Description)

**Warehouse page — SKU Locations tab**
- See all 15 registered locations (all products mapped to STOR-01 with shelf codes A-01 through D-03)
- Register a new SKU location using the form

**Warehouse page — Tasks tab**
- See completed picking tasks for orders #3–7
- Filter by status (PENDING / IN_PROGRESS / COMPLETED)

**Order Detail — mark as Picked**
1. Navigate to Order #1 or #2 (VALIDATED — alice's and bob's pending orders)
2. See the "Mark as Picked" button (only visible to WAREHOUSE_SPECIALIST and ADMIN)
3. Click → order transitions VALIDATED → PICKED
4. Kafka event fires → shipment-service creates a shipment record
5. Status bubble updates in real time

---

### 5. Shipment Lead — login as **henry.shipment** (henry@demo.com / Demo@12345)

**Shipments list**
- See three pre-seeded shipments for orders #5, #6, #7

**Shipment detail — Order #7 (DHL, DELIVERED)**
- Full history timeline: SHIPPED → IN_TRANSIT → DELIVERED with timestamps and locations
- Dispatch record: DHL driver pickup, delivery address, notes
- Signature: "Delivered — signed by C. Smith"

**Shipment detail — Order #5 (FedEx, SHIPPED) / #6 (UPS, IN_TRANSIT)**
- Single history entry (shipment created, not yet delivered)

---

### 6. Full End-to-End Flow (live demo)

1. **Place order** (login as alice)
   - Add LAPTOP-001 and CABLE-001 to cart
   - Checkout → payment sandbox → order #9 created (VALIDATED)
   - Order confirmation email fires (Kafka → notification-service → Gmail)

2. **Pick the order** (login as grace.warehouse)
   - Go to Order #9 → click "Mark as Picked"
   - Picking task automatically created with source from STOR-01 / A-01
   - Order transitions to PICKED

3. **Dispatch** (automatic via Kafka)
   - Warehouse completion Kafka event triggers shipment-service
   - Shipment record created with tracking number
   - Order status → DISPATCHED

4. **View from customer side** (login as alice)
   - Open Order #9 → all 3 status bubbles filled
   - Shipment card shows carrier and tracking number
   - Download receipt PDF from Documents page

---

## Architecture Overview

```
Browser → Nginx → API Gateway (7080) → [Eureka service discovery]
                                      ├── auth-service     (8081)
                                      ├── order-service    (2501)
                                      ├── inventory-service(2502)
                                      ├── shipment-service (2503)
                                      ├── warehouse-service(2504)
                                      ├── notification-svc (2505)
                                      ├── document-gen-svc (3050)
                                      └── cart-service     (8083)

Event bus: Kafka (29092)
  order-created-topic          → notification-service (confirmation email)
  order-status-changed-topic   → notification-service (status update email)
  order-ready-for-dispatch-topic → shipment-service (create shipment)
  warehouse-order-packed        → order-service (mark PICKED)

Databases (Postgres 5434):
  logistics_db      — auth-service, inventory-service, cart-service
  scm_order_db      — order-service
  scm_warehouse_db  — warehouse-service
  scm_shipment_db   — shipment-service

Observability: Prometheus (9090) + Grafana (3001) — local profile only
```

---

## Running the Stack

```bash
# Full stack with local infrastructure (Postgres, Kafka, Prometheus, Grafana)
docker compose --profile local up --build -d

# Without observability stack (faster)
docker compose up --build -d

# Frontend only (dev mode, needs services running separately)
cd frontend && npm run dev
```

Access points:
- **Dashboard**: http://localhost:5173
- **API Gateway**: http://localhost:7080
- **Eureka**: http://localhost:8761
- **Kafka UI**: http://localhost:9999
- **Grafana**: http://localhost:3001 (admin / admin)
