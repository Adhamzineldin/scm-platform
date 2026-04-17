package com.scm.notification.service.email;

import com.scm.notification.dto.NotificationContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Component
@RequiredArgsConstructor
public class EmailContentBuilder {

    private static final String ORDER_CONFIRMATION_TEMPLATE = "order-confirmation";

    private final TemplateEngine templateEngine;

    public String buildOrderConfirmation(NotificationContext ctx) {
        Context tplContext = new Context();
        tplContext.setVariable("customerName", ctx.user().fullName());
        tplContext.setVariable("orderId", ctx.event().orderId());
        tplContext.setVariable("shippingAddress", ctx.event().shippingAddress());
        tplContext.setVariable("items", ctx.event().items());
        return templateEngine.process(ORDER_CONFIRMATION_TEMPLATE, tplContext);
    }
}
