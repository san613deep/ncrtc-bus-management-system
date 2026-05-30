package com.ncrtc.scheduling.service;

import com.ncrtc.scheduling.dto.RouteDTO;
import com.ncrtc.scheduling.entity.Route;
import com.ncrtc.scheduling.entity.RouteStop;
import com.ncrtc.scheduling.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final RouteRepository routeRepository;

    public List<RouteDTO.Response> getAllRoutes(Integer depotId) {
        List<Route> routes = depotId != null
            ? routeRepository.findByDepotId(depotId)
            : routeRepository.findAllWithStops();
        return routes.stream().map(RouteDTO.Response::from).collect(Collectors.toList());
    }

    public RouteDTO.Response getRoute(Integer id) {
        Route route = routeRepository.findByIdWithStops(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found: " + id));
        return RouteDTO.Response.from(route);
    }

    @Transactional
    public RouteDTO.Response createRoute(RouteDTO.CreateRequest request) {
        if (routeRepository.existsByCode(request.getCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Route code already exists: " + request.getCode());
        }

        Route route = Route.builder()
            .code(request.getCode())
            .name(request.getName())
            .depotId(request.getDepotId())
            .status(Route.RouteStatus.DRAFT)
            .build();

        // Build stops
        if (request.getStops() != null) {
            List<RouteStop> stops = request.getStops().stream().map(s ->
                RouteStop.builder()
                    .route(route)
                    .stopName(s.getStopName())
                    .sequence(s.getSequence())
                    .plannedOffsetMin(s.getPlannedOffsetMin())
                    .lat(s.getLat())
                    .lng(s.getLng())
                    .build()
            ).collect(Collectors.toList());
            route.setStops(stops);
        }

        return RouteDTO.Response.from(routeRepository.save(route));
    }

    @Transactional
    public RouteDTO.Response updateRoute(Integer id, RouteDTO.CreateRequest request) {
        Route route = routeRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found: " + id));

        route.setName(request.getName());
        route.setDepotId(request.getDepotId());

        if (request.getStops() != null) {
            route.getStops().clear();
            request.getStops().forEach(s -> {
                RouteStop stop = RouteStop.builder()
                    .route(route)
                    .stopName(s.getStopName())
                    .sequence(s.getSequence())
                    .plannedOffsetMin(s.getPlannedOffsetMin())
                    .lat(s.getLat())
                    .lng(s.getLng())
                    .build();
                route.getStops().add(stop);
            });
        }

        return RouteDTO.Response.from(routeRepository.save(route));
    }

    @Transactional
    public RouteDTO.Response activateRoute(Integer id) {
        Route route = routeRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found: " + id));
        route.setStatus(Route.RouteStatus.ACTIVE);
        return RouteDTO.Response.from(routeRepository.save(route));
    }

    @Transactional
    public void deleteRoute(Integer id) {
        if (!routeRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found: " + id);
        }
        routeRepository.deleteById(id);
    }
}
