package com.scm.order_service.mappers;

import com.scm.order_service.dto.orders.OrderItemRequest;
import com.scm.order_service.dto.orders.OrderItemResponse;
import com.scm.order_service.dto.orders.OrderRequest;
import com.scm.order_service.dto.orders.OrderResponse;
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

        return response;
    }

    public PagedResponse<OrderResponse> createPagedResponse(Page<Order> orderPage) {
        // 1. Map the list of entities to DTOs
        List<OrderResponse> orderResponses = orderPage.getContent().stream()
                .map(orderMapper::toResponse)
                .collect(Collectors.toList());

        // 2. Wrap it all in our clean PagedResponse DTO
        return PagedResponse.<OrderResponse>builder()
                .content(orderResponses)
                .pageNumber(orderPage.getNumber())
                .pageSize(orderPage.getSize())
                .totalElements(orderPage.getTotalElements())
                .totalPages(orderPage.getTotalPages())
                .isLast(orderPage.isLast())
                .build();
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