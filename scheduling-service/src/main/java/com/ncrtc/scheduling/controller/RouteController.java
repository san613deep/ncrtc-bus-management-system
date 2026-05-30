package com.ncrtc.scheduling.controller;

import com.ncrtc.scheduling.dto.RouteDTO;
import com.ncrtc.scheduling.service.RouteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * RouteController — REST endpoints for bus route management.
 * All requests arrive pre-authenticated via FastAPI proxy.
 * The X-User-Role / X-User-Depot headers carry the caller's context.
 */
@RestController
@RequestMapping("/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    @GetMapping
    public List<RouteDTO.Response> listRoutes(
        @RequestParam(required = false) Integer depotId
    ) {
        return routeService.getAllRoutes(depotId);
    }

    @GetMapping("/{id}")
    public RouteDTO.Response getRoute(@PathVariable Integer id) {
        return routeService.getRoute(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RouteDTO.Response createRoute(@Valid @RequestBody RouteDTO.CreateRequest request) {
        return routeService.createRoute(request);
    }

    @PutMapping("/{id}")
    public RouteDTO.Response updateRoute(
        @PathVariable Integer id,
        @Valid @RequestBody RouteDTO.CreateRequest request
    ) {
        return routeService.updateRoute(id, request);
    }

    @PatchMapping("/{id}/activate")
    public RouteDTO.Response activateRoute(@PathVariable Integer id) {
        return routeService.activateRoute(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRoute(@PathVariable Integer id) {
        routeService.deleteRoute(id);
    }
}
