package com.scm.notification.client;

import com.scm.notification.client.dto.OrderReceiptRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "document-gen-service")
public interface DocumentClient {

    @PostMapping(
            value = "/api/documents/order-receipt",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_PDF_VALUE
    )
    byte[] generateOrderReceipt(@RequestBody OrderReceiptRequest request);
}
