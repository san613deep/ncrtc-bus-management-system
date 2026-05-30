package com.ncrtc.scheduling.repository;

import com.ncrtc.scheduling.entity.Duty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DutyRepository extends JpaRepository<Duty, Integer> {

    /** Get all duties for a date range (roster grid) */
    List<Duty> findByDutyDateBetween(LocalDate from, LocalDate to);

    /** Duties for a specific depot (via route.depotId) */
    @Query("SELECT d FROM Duty d LEFT JOIN FETCH d.route WHERE d.route.depotId = :depotId AND d.dutyDate BETWEEN :from AND :to")
    List<Duty> findByDepotAndDateRange(
        @Param("depotId") Integer depotId,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to
    );

    /** A specific driver's duties — for the driver app */
    @Query("SELECT d FROM Duty d LEFT JOIN FETCH d.route WHERE d.driverId = :driverId AND d.dutyDate >= :from AND d.status IN ('PUBLISHED','ACKNOWLEDGED') ORDER BY d.dutyDate")
    List<Duty> findPublishedDutiesForDriver(
        @Param("driverId") Integer driverId,
        @Param("from") LocalDate from
    );

    /** Check if a driver already has a duty on a given date (conflict check) */
    boolean existsByDriverIdAndDutyDate(Integer driverId, LocalDate date);

    Optional<Duty> findByIdAndDriverId(Integer id, Integer driverId);
}
