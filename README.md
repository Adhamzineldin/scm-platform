# Logistics and Warehouse Operations Platform

## Overview
A microservices-based logistics platform handling inventory, orders, internal warehouse movements, and external shipments.

## Docker Usage
Use the shared [docker-compose.yml](/D:/scm-platform/docker-compose.yml:1) for both full-platform runs and focused service testing.

To test the inventory microservice with only its required dependency:

```powershell
docker compose up -d --build postgres inventory-service
```

To start the broader platform stack:

```powershell
docker compose up -d --build
```

## Team Roles
* **Auth & Dashboard:** [Name]
* **Inventory:** [Name]
* **Orders:** [Name]
* **Warehouse Logistics:** [Name]
* **Shipment & External:** [Name]
* **Cloud & DevOps:** [Name]

