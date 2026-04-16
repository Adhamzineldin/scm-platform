package com.scm.order_service.mappers;

import com.scm.order_service.dto.orders.PagedResponse;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class PaginationMapper {

   
    public <T, R> PagedResponse<R> toPagedResponse(Page<T> page, Function<T, R> mappingFunction) {
        
        List<R> content = page.getContent().stream()
                .map(mappingFunction)
                .collect(Collectors.toList());

        return PagedResponse.<R>builder()
                .content(content)
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .isLast(page.isLast())
                .build();
    }
}