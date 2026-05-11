package com.scm.notification.service;

import com.scm.notification.dto.OrderConfirmationContext;
import com.scm.notification.dto.ShipmentDispatchedContext;
import com.scm.notification.dto.StatusUpdateContext;

public interface NotificationSender {

    String channel();

    void sendOrderConfirmation(OrderConfirmationContext context);

    void sendStatusUpdate(StatusUpdateContext context);

    void sendShipmentDispatched(ShipmentDispatchedContext context);
}
