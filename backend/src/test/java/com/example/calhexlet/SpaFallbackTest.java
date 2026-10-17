package com.example.calhexlet;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest
class SpaFallbackTest {

	private static final String APP_PAGE_MARKER = "spa-fallback-fixture";

	@Autowired
	private MockMvcTester mvc;

	@ParameterizedTest(name = "{0}")
	@ValueSource(strings = {"/book", "/admin"})
	void clientRoutePathIsServedAsAppPageOnDirectLoad(String path) {
		assertThat(mvc.get().uri(path).accept(MediaType.TEXT_HTML))
			.hasStatusOk()
			.hasContentTypeCompatibleWith(MediaType.TEXT_HTML)
			.bodyText()
			.contains(APP_PAGE_MARKER);
	}

	@ParameterizedTest(name = "{0}")
	@ValueSource(strings = {"/api/no-such-endpoint", "/api", "/api;x=1/no-such-endpoint"})
	void unknownApiPathStaysNotFoundAndDoesNotGetAppPage(String path) {
		assertThat(mvc.get().uri(path).accept(MediaType.TEXT_HTML))
			.hasStatus(HttpStatus.NOT_FOUND)
			.bodyText()
			.doesNotContain(APP_PAGE_MARKER);
	}

	@Test
	void existingStaticFileIsServedAsIs() {
		assertThat(mvc.get().uri("/assets/app.js"))
			.hasStatusOk()
			.bodyText()
			.contains("static-file-fixture")
			.doesNotContain(APP_PAGE_MARKER);
	}

	@Test
	void missingStaticFileStaysNotFound() {
		assertThat(mvc.get().uri("/assets/no-such-file.js"))
			.hasStatus(HttpStatus.NOT_FOUND)
			.bodyText()
			.doesNotContain(APP_PAGE_MARKER);
	}

}
