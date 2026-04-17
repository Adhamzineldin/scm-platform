package com.scm.notification.service;

import com.scm.notification.client.UserClient;
import com.scm.notification.dto.NotificationContext;
import com.scm.notification.dto.OrderCreatedEvent;
import com.scm.notification.dto.UserDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationDispatcher {

    private final List<NotificationSender> senders;
    private final UserClient userClient;

    public void dispatchOrderConfirmation(OrderCreatedEvent event) {
        NotificationContext context = buildContext(event);

        log.info("Dispatching Order #{} to {} channel(s) for user {}",
                event.orderId(), senders.size(), context.user().id());

        List<String> failures = senders.stream()
                .map(sender -> attemptDispatch(sender, context))
                .flatMap(Optional::stream)
                .toList();

        if (!failures.isEmpty()) {
            throw new NotificationDispatchException(
                    "Notification dispatch failed for Order #" + event.orderId() + " on channels: " + failures
            );
        }
    }


    private NotificationContext buildContext(OrderCreatedEvent event) {
        UserDto user = userClient.getUserById(event.userId());
        return new NotificationContext(event, user);
    }
    
    private Optional<String> attemptDispatch(NotificationSender sender, NotificationContext context) {
        try {
            sender.send(context);
            return Optional.empty();
        } catch (Exception ex) {
            log.error("Channel [{}] failed for Order #{}: {}",
                    sender.channel(), context.event().orderId(), ex.getMessage());
            return Optional.of(sender.channel());
        }
    }
}