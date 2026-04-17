package com.scm.discovery_server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@SpringBootApplication
@EnableEurekaServer
public class DiscoveryServerApplication {
	public static void main(String[] args) {
		System.setProperty("eureka.client.register-with-eureka", "false");
		System.setProperty("eureka.client.fetch-registry", "false");
		SpringApplication.run(DiscoveryServerApplication.class, args);
	}
}