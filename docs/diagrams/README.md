# SCM Platform PlantUML Diagrams

This folder contains all core system diagrams in source form (`.puml`).

## Diagram index

- `system-context.puml`: actors and external boundaries
- `container-architecture.puml`: service-level architecture and dependencies
- `deployment-local.puml`: local Docker deployment topology
- `deployment-aws.puml`: AWS target deployment topology
- `event-driven-order-pipeline.puml`: request -> queue -> worker -> result
- `api-map.puml`: API gateway route map to backend services

## Render commands

If PlantUML is installed locally:

```bash
plantuml docs/diagrams/*.puml
```

Generated `.png` files can be used in presentation slides and evidence docs.

