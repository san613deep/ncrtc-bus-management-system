package com.ncrtc.scheduling.dto;

import com.ncrtc.scheduling.entity.Duty;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** DTOs for Duty API */
public class DutyDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotNull private LocalDate dutyDate;
        @NotNull private Integer vehicleId;
        @NotNull private Integer driverId;
        private Integer conductorId;
        private Integer routeId;
        @NotNull private LocalTime startTime;
        private LocalTime endTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Integer id;
        private LocalDate dutyDate;
        private Integer vehicleId;
        private Integer driverId;
        private Integer conductorId;
        private Integer routeId;
        private String routeCode;
        private String routeName;
        private LocalTime startTime;
        private LocalTime endTime;
        private String status;
        private LocalDateTime ackAt;
        private LocalDateTime createdAt;

        public static Response from(Duty duty) {
            return Response.builder()
                .id(duty.getId())
                .dutyDate(duty.getDutyDate())
                .vehicleId(duty.getVehicleId())
                .driverId(duty.getDriverId())
                .conductorId(duty.getConductorId())
                .routeId(duty.getRoute() != null ? duty.getRoute().getId() : null)
                .routeCode(duty.getRoute() != null ? duty.getRoute().getCode() : null)
                .routeName(duty.getRoute() != null ? duty.getRoute().getName() : null)
                .startTime(duty.getStartTime())
                .endTime(duty.getEndTime())
                .status(duty.getStatus().name())
                .ackAt(duty.getAckAt())
                .createdAt(duty.getCreatedAt())
                .build();
        }
    }
}
