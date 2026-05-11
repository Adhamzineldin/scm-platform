# SCM Platform PlantUML Diagrams

This folder contains all PlantUML source files (`.puml`) organized by UML type.

## Folder structure

- `sequence/`: sequence diagrams (4+)
- `class/`: class diagrams (4+)
- `use-case/`: use case diagrams (4+)
- `activity/`: activity diagrams (4+)
- `evidence/`: rendered screenshots used in submission docs
- `_archive/legacy/`: archived old layout and non-target views

## Diagram index

`sequence/`
- `sequence/sequence-event-order-pipeline-overview.puml`
- `sequence/sequence-order-dispatch-failures.puml`
- `sequence/sequence-order-cancel-stock-compensation.puml`
- `sequence/sequence-auth-login-jwt-otp.puml`
- `sequence/sequence-cart-checkout-to-order.puml`
- `sequence/sequence-document-generation-and-download.puml`

`class/`
- `class/class-order-domain.puml`
- `class/class-warehouse-domain.puml`
- `class/class-shipment-domain.puml`
- `class/class-inventory-domain.puml`
- `class/class-auth-domain.puml`
- `class/class-cart-domain.puml`
- `class/class-document-generation-domain.puml`

`use-case/`
- `use-case/use-case-roles-capabilities.puml`
- `use-case/use-case-customer-commerce-flow.puml`
- `use-case/use-case-operations-fulfillment-flow.puml`
- `use-case/use-case-admin-security-observability.puml`

`activity/`
- `activity/activity-order-fulfillment.puml`
- `activity/activity-auth-login-otp.puml`
- `activity/activity-cart-to-checkout.puml`
- `activity/activity-shipment-dispatch-notification.puml`

## Render commands

If PlantUML is installed locally:

```bash
plantuml docs/diagrams/sequence/*.puml
plantuml docs/diagrams/class/*.puml
plantuml docs/diagrams/use-case/*.puml
plantuml docs/diagrams/activity/*.puml
```

Generated `.png` files can be used in presentation slides and evidence docs.

