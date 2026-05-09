package com.sygnusbiotech.pharmacyerp;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
public class dbcheck {

    @Bean
    CommandLineRunner check(MongoTemplate mongoTemplate) {
        return args -> {
            System.out.println("DATABASE NAME = " + mongoTemplate.getDb().getName());
        };
    }
}