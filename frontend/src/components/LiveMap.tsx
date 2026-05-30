"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import { Bus, Navigation, Clock, ShieldAlert } from "lucide-react";

// Fix for default Leaflet icon marker issues in modern bundle environments
// Instead, we use divIcon with beautiful glowing CSS for a superior premium visual.

interface Vehicle {
  id: number;
  reg_no: string;
  depot_id: number;
  status: "idle" | "on_duty" | "maintenance" | "off";
  model: string | null;
  capacity: number;
  last_lat: number | null;
  last_lng: number | null;
  last_speed: number | null;
  last_seen: string | null;
}

interface Ping {
  id: number;
  lat: number;
  lng: number;
  speed_kmh: number;
  ts: string;
}

interface LiveMapProps {
  vehicles?: Vehicle[];
  selectedVehicle?: Vehicle | null;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  historyPings?: Ping[];
}

// Controller component to dynamically change map view center and zoom
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, {
      animate: true,
      duration: 1.0,
    });
  }, [center, zoom, map]);
  return null;
}

export default function LiveMap({
  vehicles = [],
  selectedVehicle = null,
  onSelectVehicle,
  historyPings = [],
}: LiveMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Center around NCRTC Delhi-Meerut Regional Rapid Transit System coordinates by default
  const defaultCenter: [number, number] = [28.6139, 77.2090]; // New Delhi
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [zoomLevel, setZoomLevel] = useState<number>(11);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update center when a vehicle is selected
  useEffect(() => {
    if (selectedVehicle && selectedVehicle.last_lat && selectedVehicle.last_lng) {
      setMapCenter([selectedVehicle.last_lat, selectedVehicle.last_lng]);
      setZoomLevel(15); // Zoom closer when selecting a bus
    }
  }, [selectedVehicle]);

  // If showing history pings, adjust center to focus on the start of the path
  useEffect(() => {
    if (historyPings.length > 0) {
      const first = historyPings[0];
      setMapCenter([parseFloat(first.lat as any), parseFloat(first.lng as any)]);
      setZoomLevel(13);
    }
  }, [historyPings]);

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Mounting map context...</p>
        </div>
      </div>
    );
  }

  // Helper to create custom colored glowing markers
  const createMarkerIcon = (status: string, isSelected: boolean) => {
    let colorClass = "bg-blue-500 border-blue-200";
    let glowClass = "bg-blue-400";
    
    if (status === "on_duty") {
      colorClass = "bg-emerald-500 border-emerald-200";
      glowClass = "bg-emerald-400";
    } else if (status === "idle") {
      colorClass = "bg-amber-500 border-amber-200";
      glowClass = "bg-amber-400";
    } else if (status === "maintenance") {
      colorClass = "bg-rose-500 border-rose-200";
      glowClass = "bg-rose-400";
    } else if (status === "off") {
      colorClass = "bg-slate-500 border-slate-300";
      glowClass = "bg-slate-400";
    }

    const selectRing = isSelected ? "ring-4 ring-indigo-500 ring-offset-2 ring-offset-slate-900 scale-125" : "";

    return L.divIcon({
      className: "custom-leaflet-marker",
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border border-slate-700 shadow-xl transition-all duration-300 ${selectRing}">
          <span class="absolute inline-flex h-full w-full rounded-full ${glowClass} opacity-40 animate-ping" style="animation-duration: 2s"></span>
          <div class="w-3.5 h-3.5 rounded-full ${colorClass} border border-white"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Build the path coordinates for the history polyline
  const polylinePositions = historyPings.map(ping => [
    parseFloat(ping.lat as any),
    parseFloat(ping.lng as any)
  ]) as [number, number][];

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      
      <MapContainer
        center={mapCenter}
        zoom={zoomLevel}
        style={{ width: "100%", height: "100%", background: "#0b0f19" }}
        zoomControl={false}
      >
        {/* Dark Premium CartoDB Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapController center={mapCenter} zoom={zoomLevel} />

        {/* Render Live Vehicle Markers */}
        {vehicles.map((vehicle) => {
          if (!vehicle.last_lat || !vehicle.last_lng) return null;
          const isSelected = selectedVehicle?.id === vehicle.id;
          
          return (
            <Marker
              key={vehicle.id}
              position={[vehicle.last_lat, vehicle.last_lng]}
              icon={createMarkerIcon(vehicle.status, isSelected)}
              eventHandlers={{
                click: () => onSelectVehicle?.(vehicle),
              }}
            >
              <Popup className="premium-popup">
                <div className="p-1 text-slate-200">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-700 pb-1.5 mb-1.5">
                    <span className="font-mono font-bold text-sm text-indigo-400">{vehicle.reg_no}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      vehicle.status === "on_duty" ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800" :
                      vehicle.status === "idle" ? "bg-amber-950/80 text-amber-400 border border-amber-800" :
                      "bg-slate-800 text-slate-400"
                    }`}>
                      {vehicle.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <p className="flex items-center gap-1.5 text-slate-300">
                      <Bus className="w-3.5 h-3.5 text-slate-500" />
                      <span>{vehicle.model || "Standard Bus"} ({vehicle.capacity} cap)</span>
                    </p>
                    {vehicle.last_speed !== null && (
                      <p className="flex items-center gap-1.5 text-slate-300">
                        <Navigation className="w-3.5 h-3.5 text-slate-500" />
                        <span>Speed: <strong className="font-mono text-white">{vehicle.last_speed} km/h</strong></span>
                      </p>
                    )}
                    {vehicle.last_seen && (
                      <p className="flex items-center gap-1.5 text-slate-400 text-[10px] mt-1 border-t border-slate-800 pt-1">
                        <Clock className="w-3 h-3" />
                        <span>Last seen: {new Date(vehicle.last_seen).toLocaleTimeString()}</span>
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render GPS History Path Overlay */}
        {polylinePositions.length > 0 && (
          <>
            {/* Outline / Glow Polyline */}
            <Polyline
              positions={polylinePositions}
              pathOptions={{ color: "#4f46e5", weight: 6, opacity: 0.4 }}
            />
            {/* Primary Polyline */}
            <Polyline
              positions={polylinePositions}
              pathOptions={{ color: "#818cf8", weight: 3, opacity: 0.9, dashArray: "5, 10" }}
            />
            
            {/* Draw Start Marker */}
            <Marker 
              position={polylinePositions[0]} 
              icon={L.divIcon({
                html: `<div class="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-950/60 border border-white"></div>`,
                className: "marker-start",
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              })}
            />

            {/* Draw End / Current Position Marker */}
            <Marker 
              position={polylinePositions[polylinePositions.length - 1]} 
              icon={L.divIcon({
                html: `<div class="w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-950/60 border border-white"></div>`,
                className: "marker-end",
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              })}
            />
          </>
        )}
      </MapContainer>
      
      {/* Custom HUD Overlays */}
      <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg z-[400] text-[10px] font-mono text-slate-400 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
          <span>Duty</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
          <span>Idle</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />
          <span>Alert</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500 border border-white" />
          <span>Offline</span>
        </div>
      </div>
    </div>
  );
}
