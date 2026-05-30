"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLiveVehicles, useVehicleHistory } from "@/hooks/useVehicles";
import { 
  Bus, 
  Search, 
  SlidersHorizontal, 
  Navigation, 
  MapPin, 
  Clock, 
  Calendar,
  AlertTriangle,
  History,
  Info,
  CheckCircle2,
  Gauge
} from "lucide-react";
import { format } from "date-fns";

// Dynamically import LiveMap with SSR disabled to prevent Leaflet window reference crash
const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

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

export default function LiveAVLSPage() {
  const { vehicles, isLoading, isError } = useLiveVehicles();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Historical GPS Replay State
  const [historyDate, setHistoryDate] = useState<string>("");
  const [isHistoryActive, setIsHistoryActive] = useState(false);

  // Fetch history pings if a vehicle is selected, history mode is active, and date is picked
  const { pings: historyPings, isLoading: isHistoryLoading } = useVehicleHistory(
    isHistoryActive && selectedVehicle ? selectedVehicle.id : null,
    isHistoryActive ? historyDate : null
  );

  // Stats computation
  const stats = useMemo(() => {
    const total = vehicles.length;
    const active = vehicles.filter(v => v.status === "on_duty").length;
    const idle = vehicles.filter(v => v.status === "idle").length;
    const alert = vehicles.filter(v => v.status === "maintenance").length;
    return { total, active, idle, alert };
  }, [vehicles]);

  // Filtered vehicles list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesSearch = vehicle.reg_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (vehicle.model && vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, statusFilter]);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    // Reset history mode when selecting a new vehicle
    setIsHistoryActive(false);
    setHistoryDate("");
  };

  const handleActivateHistory = () => {
    if (!historyDate) {
      // Set to today by default if empty
      setHistoryDate(format(new Date(), "yyyy-MM-dd"));
    }
    setIsHistoryActive(true);
  };

  const handleDeactivateHistory = () => {
    setIsHistoryActive(false);
    setHistoryDate("");
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-mono tracking-wider font-semibold block">FLEET ACTIVE</span>
            <span className="text-3xl font-extrabold text-white mt-1 block font-mono">
              {stats.active}<span className="text-xs text-slate-500 font-normal ml-1">/ {stats.total}</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-mono tracking-wider font-semibold block">FLEET IDLE</span>
            <span className="text-3xl font-extrabold text-white mt-1 block font-mono">{stats.idle}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-mono tracking-wider font-semibold block">MAINTENANCE ALERTS</span>
            <span className="text-3xl font-extrabold text-rose-500 mt-1 block font-mono">{stats.alert}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-mono tracking-wider font-semibold block">GPS TELEMETRY STATE</span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mt-2 font-mono">
              REAL-TIME (5S SYNC)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Gauge className="w-6 h-6 text-indigo-400" />
          </div>
        </div>

      </div>

      {/* Main Workspace split */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Left Side Pane — List & Filters */}
        <aside className="w-96 flex flex-col bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          
          {/* Header & Controls */}
          <div className="p-5 border-b border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm tracking-wide">VEHICLE ROSTER</h3>
              <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                {filteredVehicles.length} Listed
              </span>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search registration or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: "All", value: "all" },
                { label: "On Duty", value: "on_duty" },
                { label: "Idle", value: "idle" },
                { label: "Alerts", value: "maintenance" }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all duration-150 ${
                    statusFilter === opt.value
                      ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50"
                      : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Vehicle List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoading && (
              <div className="py-12 text-center text-slate-500 text-xs">
                <div className="w-6 h-6 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin mx-auto mb-2" />
                Loading tracker database...
              </div>
            )}
            
            {!isLoading && filteredVehicles.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs">
                No matching vehicles found.
              </div>
            )}

            {filteredVehicles.map(vehicle => {
              const isSelected = selectedVehicle?.id === vehicle.id;
              return (
                <button
                  key={vehicle.id}
                  onClick={() => handleSelectVehicle(vehicle)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 group flex items-start justify-between gap-3 ${
                    isSelected
                      ? "bg-indigo-950/20 border-indigo-500/50 shadow-lg shadow-indigo-950/20"
                      : "bg-slate-900/55 border-slate-850 hover:bg-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Bus className={`w-4 h-4 flex-shrink-0 ${
                        isSelected ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
                      }`} />
                      <span className="font-mono text-xs font-bold text-slate-100">{vehicle.reg_no}</span>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 mt-1 font-sans truncate">
                      {vehicle.model || "Feeder Mini"} · Depot #{vehicle.depot_id}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {/* Status Badge */}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase font-mono tracking-wider ${
                      vehicle.status === "on_duty" ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/40" :
                      vehicle.status === "idle" ? "bg-amber-950/50 text-amber-400 border-amber-800/40" :
                      vehicle.status === "maintenance" ? "bg-rose-950/50 text-rose-400 border-rose-800/40" :
                      "bg-slate-850 text-slate-400 border-slate-750"
                    }`}>
                      {vehicle.status.replace("_", " ")}
                    </span>
                    
                    {/* Live Speed */}
                    {vehicle.last_speed !== null && vehicle.status === "on_duty" && (
                      <span className="text-[10px] text-indigo-400 font-mono font-semibold flex items-center gap-0.5">
                        <Navigation className="w-2.5 h-2.5 rotate-45 text-indigo-500" />
                        {vehicle.last_speed} km/h
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

        </aside>

        {/* Center/Right Workspace — Map & Optional Info Pane */}
        <div className="flex-1 flex gap-6 min-w-0">
          
          {/* Leaflet Map Visualizer */}
          <div className="flex-1 h-full relative">
            <LiveMap
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={handleSelectVehicle}
              historyPings={historyPings}
            />
          </div>

          {/* Right Selected Vehicle Context Drawer */}
          {selectedVehicle && (
            <aside className="w-80 bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col justify-between p-5">
              
              <div className="space-y-6">
                {/* Header info */}
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      BUS METRICS
                    </span>
                    <button
                      onClick={() => setSelectedVehicle(null)}
                      className="text-xs text-slate-500 hover:text-slate-300 font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                  <h4 className="text-lg font-bold text-white font-mono">{selectedVehicle.reg_no}</h4>
                  <p className="text-xs text-slate-400 capitalize">{selectedVehicle.model || "Feeder Standard Coach"}</p>
                </div>

                {/* Status Telemetry */}
                <div className="space-y-3.5">
                  <h5 className="text-xs font-semibold text-slate-400 tracking-wider font-mono">TELEMETRY DATA</h5>
                  
                  {/* Lat Lng */}
                  <div className="flex items-center gap-3 text-xs bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                    <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-mono font-bold leading-none mb-1">Last Coordinates</p>
                      <p className="font-mono text-slate-200">
                        {selectedVehicle.last_lat ? `${selectedVehicle.last_lat.toFixed(5)}, ${selectedVehicle.last_lng?.toFixed(5)}` : "No GPS Link"}
                      </p>
                    </div>
                  </div>

                  {/* Last Seen */}
                  <div className="flex items-center gap-3 text-xs bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                    <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-mono font-bold leading-none mb-1">Last Ping Time</p>
                      <p className="font-mono text-slate-200">
                        {selectedVehicle.last_seen ? format(new Date(selectedVehicle.last_seen), "hh:mm:ss a (dd MMM)") : "No connection"}
                      </p>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="flex items-center gap-3 text-xs bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                    <Bus className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-mono font-bold leading-none mb-1">Max Passenger Capacity</p>
                      <p className="text-slate-200 font-medium font-mono">{selectedVehicle.capacity} seats</p>
                    </div>
                  </div>
                </div>

                {/* Historical Replay Section */}
                <div className="border-t border-slate-800 pt-5 space-y-3.5">
                  <h5 className="text-xs font-semibold text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    GPS HISTORY REPLAY
                  </h5>

                  {!isHistoryActive ? (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Trace route path, speeds, and timestamps recorded by this vehicle's GPS.
                      </p>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Date</label>
                        <input
                          type="date"
                          value={historyDate}
                          onChange={(e) => setHistoryDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <button
                        onClick={handleActivateHistory}
                        className="w-full btn-primary text-xs font-semibold h-9 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10"
                      >
                        <Navigation className="w-3.5 h-3.5 rotate-45" />
                        Generate Route Path
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-xs space-y-1.5">
                        <p className="font-semibold text-indigo-400">Path Visualizer Active</p>
                        <p className="text-slate-400 text-[10px]">
                          Showing <strong className="font-mono text-slate-200">{historyPings.length}</strong> recorded pings on <strong className="font-mono text-slate-200">{historyDate}</strong>.
                        </p>
                      </div>

                      {isHistoryLoading ? (
                        <div className="text-center py-2 text-slate-500 text-[11px] font-mono animate-pulse">
                          Fetching path history...
                        </div>
                      ) : historyPings.length === 0 ? (
                        <p className="text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-lg">
                          No GPS pings recorded on this date.
                        </p>
                      ) : null}

                      <button
                        onClick={handleDeactivateHistory}
                        className="w-full py-2 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl text-xs font-medium transition-all"
                      >
                        Exit History Mode
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* Action shortcuts */}
              <div className="border-t border-slate-900/80 pt-4 text-center">
                <span className="text-[10px] text-slate-500 italic block">
                  Reg No: {selectedVehicle.reg_no} · Active Telemetry
                </span>
              </div>

            </aside>
          )}

        </div>

      </div>

    </div>
  );
}
