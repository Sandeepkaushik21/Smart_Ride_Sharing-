package com.infosys.rsa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.session.SessionAutoConfiguration;

@SpringBootApplication(exclude = {SessionAutoConfiguration.class})
public class RideSharingApplication {

	public static void main(String[] args) {
		SpringApplication.run(RideSharingApplication.class, args);
	}
}
