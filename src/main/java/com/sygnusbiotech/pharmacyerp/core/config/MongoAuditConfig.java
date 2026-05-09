package com.sygnusbiotech.pharmacyerp.core.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@Configuration
@EnableMongoAuditing
public class MongoAuditConfig {
    // Configures automatic population of @CreatedDate and @LastModifiedDate 
}
