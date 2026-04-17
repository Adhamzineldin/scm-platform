package com.scm.api_gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

import static org.springframework.cloud.gateway.server.mvc.filter.LoadBalancerFilterFunctions.lb;
import static org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions.route;
import static org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions.http;
import static org.springframework.cloud.gateway.server.mvc.predicate.GatewayRequestPredicates.path;

@Configuration
public class GatewayConfig {

    @Bean
    public RouterFunction<ServerResponse> authRoutes() {
        return route("auth-service")
                .route(path("/api/auth/**").or(path("/api/users/**")), http())
                .filter(lb("auth-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> orderRoutes() {
        return route("order-service")
                .route(path("/api/orders/**"), http())
                .filter(lb("order-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> inventoryRoutes() {
        return route("inventory-service")
                .route(path("/api/inventory/**").or(path("/api/products/**")), http())
                .filter(lb("inventory-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> shipmentRoutes() {
        return route("shipment-service")
                .route(path("/api/shipments/**"), http())
                .filter(lb("shipment-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> warehouseRoutes() {
        return route("warehouse-service")
                .route(path("/api/warehouses/**"), http())
                .filter(lb("warehouse-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> documentRoutes() {
        return route("document-gen-service")
                .route(path("/api/documents/**"), http())
                .filter(lb("document-gen-service"))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> notificationRoutes() {
        return route("notification-service")
                .route(path("/api/notifications/**"), http())
                .filter(lb("notification-service"))
                .build();
    }
}
