package com.scm.cart.dto.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProductResponse {

    private Long id;
    private String sku;
    private String name;
    private String description;
    private BigDecimal unitPrice;
    private Integer quantity;
}
