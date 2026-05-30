package com.ncrtc.scheduling.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

/**
 * RouteStop — junction between Route and Stop.
 * Defines ordered stops with planned timing offsets.
 */
@Entity
@Table(name = "route_stops")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @Column(name = "stop_id", nullable = false)
    private Integer stopId;

    @Column(name = "stop_name", nullable = false, length = 100)
    private String stopName;

    @Column(name = "sequence", nullable = false)
    private Integer sequence;

    /** Minutes after route start time when bus should arrive at this stop */
    @Column(name = "planned_offset_min", nullable = false)
    private Integer plannedOffsetMin;

    @Column(name = "lat")
    private Double lat;

    @Column(name = "lng")
    private Double lng;
}
