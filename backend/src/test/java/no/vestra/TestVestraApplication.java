package no.vestra;

import org.springframework.boot.SpringApplication;

public class TestVestraApplication {

	public static void main(String[] args) {
		SpringApplication.from(VestraApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
