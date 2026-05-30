package com.ncrtc.scheduling.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Duty Entity — maps to the 'duties' table in MySQL.
 *
 * A duty is a driver's day of work:
 *   Driver X + Vehicle Y on Route Z on Date D, starting at Time T
 *
 * Lifecycle:
 *   DRAFT → PUBLISHED (manager publishes, driver can now see it)
 *   PUBLISHED → ACKNOWLEDGED (driver taps "acknowledge" in app)
 *   ACKNOWLEDGED → COMPLETED (end of day, system marks complete)
 */
@Entity
@Table(
    name = "duties",
    indexes = {
        @Index(name = "idx_duty_date_route", columnList = "duty_date, route_id")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Duty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "duty_date", nullable = false)
    private LocalDate dutyDate;

    @Column(name = "vehicle_id", nullable = false)
    private Integer vehicleId;    // References PostgreSQL vehicles.id

    @Column(name = "driver_id", nullable = false)
    private Integer driverId;     // References PostgreSQL users.id

    @Column(name = "conductor_id")
    private Integer conductorId;  // Optional — References PostgreSQL users.id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id")
    private Route route;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DutyStatus status = DutyStatus.DRAFT;

    @Column(name = "ack_at")
    private LocalDateTime ackAt;   // Timestamp when driver acknowledged

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum DutyStatus {
        DRAFT, PUBLISHED, ACKNOWLEDGED, COMPLETED
    }
}
