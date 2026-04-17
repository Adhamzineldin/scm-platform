package com.scm.notification.service;

import com.scm.notification.dto.NotificationContext;

public interface NotificationSender {

    String channel();

    void send(NotificationContext context);
}
