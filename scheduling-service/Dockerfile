# =============================================================
# Spring Boot Scheduling Service Dockerfile
# Multi-stage build: compile in one stage, run in a smaller image
# =============================================================

# Stage 1: Build with Maven
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy pom.xml first (layer caching — only re-downloads dependencies if pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy source and build
COPY src ./src
RUN mvn package -DskipTests -q

# Stage 2: Run with just the JRE (smaller image)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the built JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

# JVM tuning for containers:
# -Xmx512m: max heap 512MB (appropriate for t3.small)
# -XX:+UseContainerSupport: respect container memory limits
ENTRYPOINT ["java", "-Xmx512m", "-XX:+UseContainerSupport", "-jar", "app.jar"]
