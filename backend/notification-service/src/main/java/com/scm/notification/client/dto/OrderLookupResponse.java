package com.scm.notification.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record OrderLookupResponse(
        Long id,
        String userId,
        String shippingAddress,
        String status
) {
}

