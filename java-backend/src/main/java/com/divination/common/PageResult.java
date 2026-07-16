package com.divination.common;

import lombok.Data;

import java.util.List;

@Data
public class PageResult<T> {
    private long total;
    private int page;
    private int size;
    private List<T> list;

    private PageResult(long total, int page, int size, List<T> list) {
        this.total = total;
        this.page = page;
        this.size = size;
        this.list = list;
    }

    public static <T> PageResult<T> of(long total, int page, int size, List<T> list) {
        return new PageResult<>(total, page, size, list);
    }
}
