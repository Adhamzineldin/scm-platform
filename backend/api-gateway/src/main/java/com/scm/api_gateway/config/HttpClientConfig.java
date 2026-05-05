package com.scm.api_gateway.config;

import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.springframework.boot.http.client.HttpComponentsClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.autoconfigure.ClientHttpRequestFactoryBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * SSE connections to /api/notifications/stream hold Apache HttpClient5 pool slots open
 * for up to 30 minutes. Default maxConnPerRoute (~5) is exhausted immediately, causing
 * ConnectionRequestTimeoutException for regular requests (e.g. /api/notifications/admin).
 * Raise the pool limits high enough to accommodate concurrent SSE subscribers alongside
 * normal API traffic.
 */
@Configuration
public class HttpClientConfig {

    @Bean
    public ClientHttpRequestFactoryBuilderCustomizer<HttpComponentsClientHttpRequestFactoryBuilder> connectionPoolCustomizer() {
        return builder -> builder.withConnectionManagerCustomizer(
                (PoolingHttpClientConnectionManagerBuilder cm) -> cm
                        .setMaxConnPerRoute(200)
                        .setMaxConnTotal(500));
    }
}
