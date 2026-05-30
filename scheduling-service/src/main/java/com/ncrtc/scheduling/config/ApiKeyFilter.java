package com.ncrtc.scheduling.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * ApiKeyFilter — validates that every request carries the correct internal API key.
 * This ensures the Spring Boot service can only be called by FastAPI, not directly.
 * 
 * The API key is passed as: Authorization: Bearer <INTERNAL_API_KEY>
 */
@Component
@Order(1)
public class ApiKeyFilter implements Filter {

    @Value("${app.internal-api-key}")
    private String internalApiKey;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpReq = (HttpServletRequest) request;
        HttpServletResponse httpResp = (HttpServletResponse) response;

        // Allow health check without auth
        String path = httpReq.getRequestURI();
        if (path.equals("/actuator/health") || path.equals("/health")) {
            chain.doFilter(request, response);
            return;
        }

        String authHeader = httpReq.getHeader("Authorization");
        String expectedToken = "Bearer " + internalApiKey;

        if (authHeader == null || !authHeader.equals(expectedToken)) {
            httpResp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            httpResp.setContentType("application/json");
            httpResp.getWriter().write("{\"error\":\"Invalid or missing internal API key\"}");
            return;
        }

        chain.doFilter(request, response);
    }
}
