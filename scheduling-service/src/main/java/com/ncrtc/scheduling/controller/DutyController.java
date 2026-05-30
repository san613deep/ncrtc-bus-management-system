package com.ncrtc.scheduling.controller;

import com.ncrtc.scheduling.dto.DutyDTO;
import com.ncrtc.scheduling.service.DutyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * DutyController — roster management endpoints.
 * Driver ID for operations comes from X-User-Id header (set by FastAPI proxy).
 */
@RestController
@RequestMapping("/duties")
@RequiredArgsConstructor
public class DutyController {

    private final DutyService dutyService;

    @GetMapping
    public List<DutyDTO.Response> listDuties(
        @RequestParam(required = false) Integer depotId,
        @RequestParam(required = false) String week
    ) {
        return dutyService.getDuties(depotId, week);
    }

    @GetMapping("/mine")
    public List<DutyDTO.Response> myDuties(
        @RequestHeader("X-User-Id") Integer driverId
    ) {
        return dutyService.getDriverDuties(driverId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DutyDTO.Response createDuty(@Valid @RequestBody DutyDTO.CreateRequest request) {
        return dutyService.createDuty(request);
    }

    @PatchMapping("/{id}/publish")
    public DutyDTO.Response publishDuty(@PathVariable Integer id) {
        return dutyService.publishDuty(id);
    }

    @PatchMapping("/{id}/ack")
    public DutyDTO.Response acknowledgeDuty(
        @PathVariable Integer id,
        @RequestHeader("X-User-Id") Integer driverId
    ) {
        return dutyService.acknowledgeDuty(id, driverId);
    }
}
