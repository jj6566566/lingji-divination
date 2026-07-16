package com.divination.service;

import com.divination.entity.User;
import com.divination.exception.BusinessException;
import com.divination.mapper.UserMapper;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserMapper userMapper;

    public UserService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    public User getById(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() == 0) {
            throw new BusinessException(404, "用户不存在");
        }
        return user;
    }

    public void updateEmail(Long userId, String email) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }
        user.setEmail(email);
        userMapper.updateById(user);
    }
}
