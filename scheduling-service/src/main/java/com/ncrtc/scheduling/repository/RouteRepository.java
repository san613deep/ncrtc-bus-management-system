package com.ncrtc.scheduling.repository;

import com.ncrtc.scheduling.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteRepository extends JpaRepository<Route, Integer> {

    List<Route> findByDepotId(Integer depotId);

    List<Route> findByDepotIdAndStatus(Integer depotId, Route.RouteStatus status);

    Optional<Route> findByCode(String code);

    boolean existsByCode(String code);

    @Query("SELECT r FROM Route r LEFT JOIN FETCH r.stops WHERE r.id = :id")
    Optional<Route> findByIdWithStops(Integer id);

    @Query("SELECT r FROM Route r LEFT JOIN FETCH r.stops ORDER BY r.depotId, r.code")
    List<Route> findAllWithStops();
}
