package com.scm.inventory_service.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI inventoryOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Inventory Service API")
                        .version("1.0.0")
                        .description("Contract for product catalog and stock operations in the SCM platform.")
                        .contact(new Contact().name("SCM Platform Team")));
    }

    @Bean
    public GroupedOpenApi inventoryApiGroup() {
        return GroupedOpenApi.builder()
                .group("inventory-service")
                .pathsToMatch("/api/**")
                .packagesToScan("com.scm.inventory_service.controller")
                .build();
    }
}
