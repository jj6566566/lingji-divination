package com.divination.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.divination.entity.DivinationRecord;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface DivinationMapper extends BaseMapper<DivinationRecord> {
}
