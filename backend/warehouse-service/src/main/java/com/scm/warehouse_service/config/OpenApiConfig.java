package com.scm.warehouse_service.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI warehouseOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Warehouse Service API")
                .version("1.0.0")
                .description("Warehouse zones, SKU locations, picking tasks, and movement tracking."));
    }
}
