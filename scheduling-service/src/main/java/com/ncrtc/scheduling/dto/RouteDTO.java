package com.ncrtc.scheduling.dto;

import com.ncrtc.scheduling.entity.Route;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

/** DTOs for Route API requests and responses */
public class RouteDTO {

    /** Request body for creating/updating a route */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Route code is required")
        @Size(max = 20)
        private String code;

        @NotBlank(message = "Route name is required")
        @Size(max = 100)
        private String name;

        @NotNull(message = "Depot ID is required")
        private Integer depotId;

        private List<StopItem> stops;

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class StopItem {
            private String stopName;
            private Integer sequence;
            private Integer plannedOffsetMin;
            private Double lat;
            private Double lng;
        }
    }

    /** Response body for a route */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Integer id;
        private String code;
        private String name;
        private Integer depotId;
        private String status;
        private LocalDateTime createdAt;
        private List<StopResponse> stops;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class StopResponse {
            private Integer id;
            private String stopName;
            private Integer sequence;
            private Integer plannedOffsetMin;
            private Double lat;
            private Double lng;
        }

        public static Response from(Route route) {
            List<StopResponse> stopsResp = route.getStops() == null ? List.of() :
                route.getStops().stream().map(s -> StopResponse.builder()
                    .id(s.getId())
                    .stopName(s.getStopName())
                    .sequence(s.getSequence())
                    .plannedOffsetMin(s.getPlannedOffsetMin())
                    .lat(s.getLat())
                    .lng(s.getLng())
                    .build()
                ).toList();

            return Response.builder()
                .id(route.getId())
                .code(route.getCode())
                .name(route.getName())
                .depotId(route.getDepotId())
                .status(route.getStatus().name())
                .createdAt(route.getCreatedAt())
                .stops(stopsResp)
                .build();
        }
    }
}
