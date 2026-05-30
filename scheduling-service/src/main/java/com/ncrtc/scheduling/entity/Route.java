package com.ncrtc.scheduling.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Route Entity — maps to the 'routes' table in MySQL.
 *
 * A route is an ordered collection of stops that a bus travels.
 * Example: RT-NDA-01 = Noida Sector 37 → Sector 18 → Botanical Garden
 *
 * @Data        → Lombok generates getters, setters, equals, hashCode, toString
 * @Builder     → Enables Route.builder().code("RT-NDA-01").name("...").build()
 * @NoArgsConstructor, @AllArgsConstructor → Required by JPA and Lombok @Builder
 */
@Entity
@Table(name = "routes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false, length = 20)
    private String code;           // e.g., "RT-NDA-01"

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "depot_id", nullable = false)
    private Integer depotId;       // References PostgreSQL depots.id

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RouteStatus status = RouteStatus.DRAFT;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // One route has many stops (ordered by sequence)
    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("sequence ASC")
    private List<RouteStop> stops;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum RouteStatus {
        DRAFT, ACTIVE, INACTIVE
    }
}
