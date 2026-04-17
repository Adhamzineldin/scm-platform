package com.scm.order_service.mappers;

import com.scm.order_service.dto.orders.*;
import com.scm.order_service.entity.Order;
import com.scm.order_service.entity.OrderItem;
import com.scm.order_service.enums.OrderStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class OrderMapper {
    

    public Order toEntity(OrderRequest request) {
        Order order = new Order();
        order.setStatus(OrderStatus.CREATED);
        order.setShippingAddress(request.getShippingAddress());

        if (request.getItems() != null) {
            request.getItems().stream()
                    .map(this::toOrderItemEntity)
                    .forEach(order::addItem);
        }
        return order;
    }

    public OrderResponse toResponse(Order order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setUserId(order.getUserId());
        response.setStatus(order.getStatus());
        response.setItems(mapOrderItemResponses(order.getItems()));
        response.setShippingAddress(order.getShippingAddress());

        return response;
    }
    
    private List<OrderItemResponse> mapOrderItemResponses(List<OrderItem> items) {
        if (items == null || items.isEmpty()) {
            return new ArrayList<>();
        }
        return items.stream()
                .map(this::toOrderItemResponse)
                .collect(Collectors.toList());
    }

    private OrderItem toOrderItemEntity(OrderItemRequest itemRequest) {
        OrderItem item = new OrderItem();
        item.setSku(itemRequest.getSku());
        item.setQuantity(itemRequest.getQuantity());
        return item;
    }

    private OrderItemResponse toOrderItemResponse(OrderItem item) {
        OrderItemResponse itemResponse = new OrderItemResponse();
        itemResponse.setSku(item.getSku());
        itemResponse.setQuantity(item.getQuantity());
        return itemResponse;
    }
}