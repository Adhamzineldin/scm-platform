package com.scm.notification.service.email;

import com.scm.notification.dto.OrderConfirmationContext;
import com.scm.notification.dto.ShipmentDispatchedContext;
import com.scm.notification.dto.StatusUpdateContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Component
@RequiredArgsConstructor
public class EmailContentBuilder {

    private static final String ORDER_CONFIRMATION_TEMPLATE = "order-confirmation";
    private static final String STATUS_UPDATE_TEMPLATE = "order-status-update";
    private static final String SHIPMENT_DISPATCHED_TEMPLATE = "shipment-dispatched";

    private final TemplateEngine templateEngine;

    public String buildOrderConfirmation(OrderConfirmationContext ctx) {
        Context tplContext = new Context();
        tplContext.setVariable("customerName", ctx.user().username());
        tplContext.setVariable("orderId", ctx.event().orderId());
        tplContext.setVariable("shippingAddress", ctx.event().shippingAddress());
        tplContext.setVariable("items", ctx.event().items());
        return templateEngine.process(ORDER_CONFIRMATION_TEMPLATE, tplContext);
    }

    public String buildStatusUpdate(StatusUpdateContext ctx) {
        Context tplContext = new Context();
        tplContext.setVariable("customerName", ctx.user().username());
        tplContext.setVariable("orderId", ctx.event().orderId());
        tplContext.setVariable("previousStatus", ctx.event().previousStatus());
        tplContext.setVariable("newStatus", ctx.event().newStatus());
        tplContext.setVariable("changedAt", ctx.event().changedAt());
        return templateEngine.process(STATUS_UPDATE_TEMPLATE, tplContext);
    }

    public String buildShipmentDispatched(ShipmentDispatchedContext ctx) {
        Context tplContext = new Context();
        tplContext.setVariable("customerName", ctx.user().username());
        tplContext.setVariable("orderId", ctx.event().orderId());
        tplContext.setVariable("carrier", ctx.event().carrier());
        tplContext.setVariable("trackingNumber", ctx.event().trackingNumber());
        tplContext.setVariable("shippingAddress", ctx.event().shippingAddress());
        tplContext.setVariable("status", ctx.event().status());
        tplContext.setVariable("statusChangedAt", ctx.event().statusChangedAt());
        tplContext.setVariable("dispatchedAt", ctx.event().dispatchedAt());
        return templateEngine.process(SHIPMENT_DISPATCHED_TEMPLATE, tplContext);
    }
}
