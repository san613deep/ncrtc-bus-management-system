package com.ncrtc.scheduling.service;

import com.ncrtc.scheduling.dto.DutyDTO;
import com.ncrtc.scheduling.entity.Duty;
import com.ncrtc.scheduling.entity.Route;
import com.ncrtc.scheduling.repository.DutyRepository;
import com.ncrtc.scheduling.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DutyService {

    private final DutyRepository dutyRepository;
    private final RouteRepository routeRepository;

    public List<DutyDTO.Response> getDuties(Integer depotId, String weekStr) {
        LocalDate from, to;
        if (weekStr != null && !weekStr.isBlank()) {
            // weekStr format: "2025-W03" → parse ISO week
            try {
                java.time.temporal.WeekFields wf = java.time.temporal.WeekFields.ISO;
                int year = Integer.parseInt(weekStr.substring(0, 4));
                int week = Integer.parseInt(weekStr.substring(6));
                LocalDate weekStart = LocalDate.of(year, 1, 1)
                    .with(wf.weekOfWeekBasedYear(), week)
                    .with(wf.dayOfWeek(), 1);
                from = weekStart;
                to = weekStart.plusDays(6);
            } catch (Exception e) {
                from = LocalDate.now().minusDays(3);
                to = LocalDate.now().plusDays(7);
            }
        } else {
            from = LocalDate.now().minusDays(1);
            to = LocalDate.now().plusDays(7);
        }

        List<Duty> duties = depotId != null
            ? dutyRepository.findByDepotAndDateRange(depotId, from, to)
            : dutyRepository.findByDutyDateBetween(from, to);

        return duties.stream().map(DutyDTO.Response::from).collect(Collectors.toList());
    }

    public List<DutyDTO.Response> getDriverDuties(Integer driverId) {
        return dutyRepository.findPublishedDutiesForDriver(driverId, LocalDate.now())
            .stream().map(DutyDTO.Response::from).collect(Collectors.toList());
    }

    @Transactional
    public DutyDTO.Response createDuty(DutyDTO.CreateRequest request) {
        // Conflict check: same driver, same date
        if (dutyRepository.existsByDriverIdAndDutyDate(request.getDriverId(), request.getDutyDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Driver already has a duty on " + request.getDutyDate());
        }

        Route route = null;
        if (request.getRouteId() != null) {
            route = routeRepository.findById(request.getRouteId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found"));
        }

        Duty duty = Duty.builder()
            .dutyDate(request.getDutyDate())
            .vehicleId(request.getVehicleId())
            .driverId(request.getDriverId())
            .conductorId(request.getConductorId())
            .route(route)
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .status(Duty.DutyStatus.DRAFT)
            .build();

        return DutyDTO.Response.from(dutyRepository.save(duty));
    }

    @Transactional
    public DutyDTO.Response publishDuty(Integer id) {
        Duty duty = dutyRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Duty not found: " + id));

        if (duty.getStatus() != Duty.DutyStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT duties can be published");
        }

        duty.setStatus(Duty.DutyStatus.PUBLISHED);
        return DutyDTO.Response.from(dutyRepository.save(duty));
    }

    @Transactional
    public DutyDTO.Response acknowledgeDuty(Integer id, Integer driverId) {
        Duty duty = dutyRepository.findByIdAndDriverId(id, driverId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Duty not found"));

        if (duty.getStatus() != Duty.DutyStatus.PUBLISHED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PUBLISHED duties can be acknowledged");
        }

        duty.setStatus(Duty.DutyStatus.ACKNOWLEDGED);
        duty.setAckAt(LocalDateTime.now());
        return DutyDTO.Response.from(dutyRepository.save(duty));
    }
}
