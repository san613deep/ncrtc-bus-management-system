"""
gps_tick.py — GPS Simulation Script
=====================================
This script makes the live map feel alive by inserting new GPS pings
for all "on_duty" vehicles every TICK_INTERVAL_SECONDS.

HOW IT WORKS:
1. On startup, loads all on-duty vehicles and assigns each a route
2. Every tick, moves each vehicle one step forward along its route
3. When a vehicle reaches the end of its route, it starts over (loop)
4. POSTs each new position to the FastAPI /gps/ping endpoint

This script is what the PRD calls the "tick script approach" (recommended).

PRODUCTION NOTE: In a real system, this would be:
- A TCP ingest server receiving NMEA sentences from GPS hardware
- A message queue (Kafka/RabbitMQ) buffering the stream
- A consumer service writing pings to the DB
- Here: a simple polling loop is equivalent for demo purposes

Run: docker compose up (starts automatically)
Manual: python gps_tick.py
"""

import os
import time
import math
import requests
import logging
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [TICK] %(message)s"
)
log = logging.getLogger(__name__)

# Configuration from environment
API_URL = os.getenv("API_URL", "http://localhost:8000")
TICK_API_KEY = os.getenv("TICK_API_KEY", "")
TICK_INTERVAL = int(os.getenv("TICK_INTERVAL_SECONDS", "5"))

# --- Route Paths ---
# Each route is a list of [lat, lng] waypoints.
# The tick script cycles through these waypoints continuously.
ROUTE_PATHS = {
    "RT-NDA-01": [
        [28.5706, 77.3219], [28.5730, 77.3200], [28.5760, 77.3175],
        [28.5790, 77.3150], [28.5820, 77.3125], [28.5850, 77.3100],
        [28.5880, 77.3075], [28.5920, 77.3050], [28.5960, 77.3025],
        [28.5990, 77.3000], [28.6020, 77.2975], [28.6050, 77.2950],
        [28.6080, 77.2925], [28.6110, 77.2900], [28.6140, 77.2880],
    ],
    "RT-AVH-01": [
        [28.6469, 77.3159], [28.6490, 77.3180], [28.6510, 77.3200],
        [28.6530, 77.3230], [28.6550, 77.3260], [28.6570, 77.3290],
        [28.6590, 77.3320], [28.6610, 77.3350], [28.6630, 77.3380],
        [28.6650, 77.3410], [28.6670, 77.3440], [28.6690, 77.3470],
    ],
    "RT-GZB-01": [
        [28.6692, 77.4538], [28.6720, 77.4570], [28.6750, 77.4600],
        [28.6780, 77.4630], [28.6810, 77.4660], [28.6840, 77.4690],
        [28.6870, 77.4720], [28.6900, 77.4750], [28.6930, 77.4780],
    ],
}

ROUTE_NAMES = list(ROUTE_PATHS.keys())


def compute_speed(waypoints: list, current_idx: int) -> float:
    """
    Simulate realistic speed based on position in route.
    - Slow down near the start/end (depot/stop areas)
    - Faster in the middle (highway segments)
    """
    n = len(waypoints)
    position_ratio = current_idx / max(n - 1, 1)  # 0.0 to 1.0
    
    # Sinusoidal speed pattern: slow at ends, fast in middle
    base_speed = 30.0 + 20.0 * math.sin(position_ratio * math.pi)
    return round(base_speed, 1)


def wait_for_backend(max_retries=30, delay=5):
    """Wait until the backend API is available."""
    log.info(f"Waiting for backend at {API_URL}...")
    for attempt in range(max_retries):
        try:
            resp = requests.get(f"{API_URL}/health", timeout=5)
            if resp.status_code == 200:
                log.info("Backend is ready!")
                return True
        except requests.exceptions.ConnectionError:
            pass
        log.info(f"Backend not ready yet (attempt {attempt+1}/{max_retries}). Waiting {delay}s...")
        time.sleep(delay)
    return False


def get_active_vehicles() -> list[dict]:
    """Fetch all on-duty vehicles from the API."""
    try:
        resp = requests.get(
            f"{API_URL}/api/v1/vehicles/live",
            headers={"Authorization": f"Bearer {TICK_API_KEY}"},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        log.error(f"Failed to fetch vehicles: {e}")
    return []


def post_ping(vehicle_id: int, lat: float, lng: float, speed: float) -> bool:
    """POST a new GPS ping to the backend."""
    try:
        resp = requests.post(
            f"{API_URL}/api/v1/gps/ping",
            json={
                "vehicle_id": vehicle_id,
                "lat": lat,
                "lng": lng,
                "speed_kmh": speed,
                "ignition_on": True,
            },
            headers={"Authorization": f"Bearer {TICK_API_KEY}"},
            timeout=5,
        )
        return resp.status_code == 201
    except Exception as e:
        log.error(f"Failed to post ping for vehicle {vehicle_id}: {e}")
        return False


def main():
    """Main tick loop."""
    log.info("🚌 GPS Tick Script starting...")
    
    if not wait_for_backend():
        log.error("Backend never became ready. Exiting.")
        return
    
    # Fetch vehicles once at startup
    # In a real system you'd refresh this periodically
    vehicles = get_active_vehicles()
    
    if not vehicles:
        log.warning("No vehicles returned from API. Using hardcoded vehicle IDs 1-10.")
        vehicles = [{"id": i} for i in range(1, 11)]
    
    log.info(f"Tracking {len(vehicles)} vehicles")
    
    # Track current waypoint index for each vehicle
    # Key: vehicle_id, Value: {"route_idx": int, "waypoint_idx": int}
    vehicle_state: dict[int, dict] = {}
    
    for i, vehicle in enumerate(vehicles):
        vid = vehicle.get("id", i + 1)
        route_idx = i % len(ROUTE_NAMES)  # Round-robin assign routes
        vehicle_state[vid] = {
            "route_name": ROUTE_NAMES[route_idx],
            "waypoint_idx": i % len(ROUTE_PATHS[ROUTE_NAMES[route_idx]]),
        }
    
    tick_count = 0
    
    while True:
        tick_count += 1
        success_count = 0
        
        for vehicle in vehicles:
            vid = vehicle.get("id")
            if not vid or vid not in vehicle_state:
                continue
            
            state = vehicle_state[vid]
            route_name = state["route_name"]
            waypoints = ROUTE_PATHS[route_name]
            waypoint_idx = state["waypoint_idx"]
            
            lat, lng = waypoints[waypoint_idx]
            speed = compute_speed(waypoints, waypoint_idx)
            
            if post_ping(vid, lat, lng, speed):
                success_count += 1
            
            # Advance to next waypoint (loop back to start when done)
            next_idx = (waypoint_idx + 1) % len(waypoints)
            vehicle_state[vid]["waypoint_idx"] = next_idx
        
        log.info(f"Tick #{tick_count}: {success_count}/{len(vehicles)} pings sent successfully")
        time.sleep(TICK_INTERVAL)


if __name__ == "__main__":
    main()
