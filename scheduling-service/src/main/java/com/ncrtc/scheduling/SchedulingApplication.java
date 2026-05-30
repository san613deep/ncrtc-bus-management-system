package com.ncrtc.scheduling;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * NCRTC Scheduling Service — Spring Boot Application Entry Point
 *
 * This service handles:
 * - Routes: Create, update, delete bus routes with stops
 * - Duties: Assign drivers to vehicles, publish schedules
 * - Roster: Weekly grid view (driver × day → duty)
 *
 * This service is INTERNAL — it's not exposed to the internet.
 * FastAPI acts as the gateway and forwards requests here after
 * validating JWT authentication and role permissions.
 *
 * Caller authentication: X-API-Key header (INTERNAL_API_KEY env var)
 * User context: X-User-Id, X-User-Role, X-User-Depot headers
 *   (passed by FastAPI so we can scope data per depot)
 */
@SpringBootApplication
public class SchedulingApplication {
    public static void main(String[] args) {
        SpringApplication.run(SchedulingApplication.class, args);
    }
}
