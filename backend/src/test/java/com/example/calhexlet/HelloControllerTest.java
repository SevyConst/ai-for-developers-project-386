package com.example.calhexlet;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(HelloController.class)
class HelloControllerTest {

	@Autowired
	private MockMvcTester mvc;

	@Test
	void helloReturnsGreetingAsJson() {
		assertThat(mvc.get().uri("/api/hello"))
			.hasStatusOk()
			.hasContentTypeCompatibleWith(MediaType.APPLICATION_JSON)
			.bodyJson()
			.extractingPath("$.message")
			.isEqualTo("Greetings from Spring Boot!");
	}

}
