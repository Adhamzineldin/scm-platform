package com.scm.order_service.mappers;

import com.scm.order_service.dto.orders.PagedResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

class PaginationMapperTest {

    private PaginationMapper paginationMapper;

    @BeforeEach
    void setUp() {
        paginationMapper = new PaginationMapper();
    }

    @Test
    @DisplayName("should map Spring Page to PagedResponse with correct metadata")
    void shouldMapPageToPagedResponse() {
        List<String> content = List.of("item-1", "item-2", "item-3");
        Page<String> page = new PageImpl<>(content, PageRequest.of(0, 10), 3);

        PagedResponse<String> result = paginationMapper.toPagedResponse(page, s -> s.toUpperCase());

        assertThat(result.getContent()).containsExactly("ITEM-1", "ITEM-2", "ITEM-3");
        assertThat(result.getPageNumber()).isZero();
        assertThat(result.getPageSize()).isEqualTo(10);
        assertThat(result.getTotalElements()).isEqualTo(3);
        assertThat(result.getTotalPages()).isEqualTo(1);
        assertThat(result.isLast()).isTrue();
    }

    @Test
    @DisplayName("should handle empty page correctly")
    void shouldHandleEmptyPage() {
        Page<String> emptyPage = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);

        PagedResponse<Integer> result = paginationMapper.toPagedResponse(emptyPage, String::length);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
        assertThat(result.getTotalPages()).isZero();
        assertThat(result.isLast()).isTrue();
    }

    @Test
    @DisplayName("should correctly indicate non-last page")
    void shouldIndicateNonLastPage() {
        List<String> content = List.of("a", "b");
        Page<String> page = new PageImpl<>(content, PageRequest.of(0, 2), 10);

        PagedResponse<String> result = paginationMapper.toPagedResponse(page, s -> s);

        assertThat(result.isLast()).isFalse();
        assertThat(result.getTotalPages()).isEqualTo(5);
        assertThat(result.getPageNumber()).isZero();
    }

    @Test
    @DisplayName("should apply mapping function to transform content")
    void shouldApplyMappingFunction() {
        List<Integer> numbers = List.of(1, 2, 3);
        Page<Integer> page = new PageImpl<>(numbers, PageRequest.of(0, 10), 3);

        PagedResponse<String> result = paginationMapper.toPagedResponse(page, n -> "num-" + n);

        assertThat(result.getContent()).containsExactly("num-1", "num-2", "num-3");
    }
}
