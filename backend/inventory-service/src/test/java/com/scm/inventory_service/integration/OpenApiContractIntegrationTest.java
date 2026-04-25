package com.scm.inventory_service.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OpenApiContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ResourceLoader resourceLoader;

    @Test
    @DisplayName("should expose generated OpenAPI docs and Swagger UI")
    void shouldExposeGeneratedOpenApiDocs() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"/api/inventory/bulk-reserve\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"/api/products/{id}\"")));

        mockMvc.perform(get("/v3/api-docs.yaml"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/inventory/check")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/products/sku/{sku}")));

        mockMvc.perform(get("/swagger-ui.html"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    @DisplayName("should keep the checked-in inventory contract aligned with the documented endpoints")
    void shouldKeepCheckedInContractAligned() throws Exception {
        Resource contractResource = resourceLoader.getResource("classpath:static/openapi/inventory-service.yaml");
        String checkedInContract = contractResource.getContentAsString(StandardCharsets.UTF_8);

        assertThat(checkedInContract)
                .contains("/api/products:")
                .contains("/api/products/{id}:")
                .contains("/api/products/sku/{sku}:")
                .contains("/api/inventory/check:")
                .contains("/api/inventory/status:")
                .contains("/api/inventory/bulk-check:")
                .contains("/api/inventory/bulk-reserve:");
    }
}
