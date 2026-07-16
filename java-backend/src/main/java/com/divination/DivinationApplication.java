package com.divination;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.divination.mapper")
public class DivinationApplication {

    public static void main(String[] args) {
        SpringApplication.run(DivinationApplication.class, args);
    }
}
