package com.example.calhexlet;

import java.io.IOException;

import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * SPA-fallback: пути клиентской маршрутизации получают {@code index.html}, см. ADR-0001.
 */
@Configuration
public class SpaFallbackConfig implements WebMvcConfigurer {

	private static final String STATIC_LOCATION = "classpath:/static/";

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		// Без кэша цепочки: он без ограничения запоминал бы index.html под каждым выдуманным путём.
		registry.addResourceHandler("/**")
			.addResourceLocations(STATIC_LOCATION)
			.resourceChain(false)
			.addResolver(new IndexHtmlFallbackResolver());
	}

	@NullMarked
	private static final class IndexHtmlFallbackResolver extends PathResourceResolver {

		@Override
		protected @Nullable Resource getResource(String resourcePath, Resource location) throws IOException {
			Resource resource = super.getResource(resourcePath, location);
			if (resource != null || isApiPath(resourcePath) || lastSegmentHasDot(resourcePath)) {
				return resource;
			}
			Resource index = location.createRelative("index.html");
			return index.isReadable() ? index : null;
		}

		private static boolean isApiPath(String resourcePath) {
			return resourcePath.equals("api") || resourcePath.startsWith("api/");
		}

		private static boolean lastSegmentHasDot(String resourcePath) {
			return resourcePath.substring(resourcePath.lastIndexOf('/') + 1).contains(".");
		}

	}

}
