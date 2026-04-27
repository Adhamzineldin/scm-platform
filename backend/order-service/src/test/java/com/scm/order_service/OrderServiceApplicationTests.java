package com.scm.order_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@EmbeddedKafka(
		partitions = 1,
		topics = {
				"order-created-topic",
				"order-ready-for-dispatch-topic",
				"order-status-changed-topic",
				"warehouse-order-packed"
		})
class OrderServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
