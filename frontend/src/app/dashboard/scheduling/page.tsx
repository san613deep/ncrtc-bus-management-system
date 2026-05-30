"use client";

import { useEffect, useState } from "react";
import { schedulingApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { 
  Calendar, 
  Map, 
  Plus, 
  Layers, 
  Search, 
  Navigation, 
  User, 
  Bus, 
  AlertOctagon, 
  CheckCircle2, 
  Globe, 
  Grid,
  MapPin,
  Clock,
  ArrowRight,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";

interface Route {
  id: number;
  routeCode: string;
  source: string;
  destination: string;
  isActive: boolean;
}

interface Duty {
  id: number;
  date: string;
  driverId: number;
  vehicleId: number;
  routeId: number;
  routeCode: string;
  driverName?: string;
  vehicleRegNo?: string;
  status: "draft" | "published" | "acknowledged";
  publishedAt: string | null;
  acknowledgedAt: string | null;
}

export default function SchedulingPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"duties" | "routes">("duties");
  
  // Roster lists
  const [routes, setRoutes] = useState<Route[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [dutiesLoading, setDutiesLoading] = useState(false);

  // Week Selector states (defaults to current week ISO string)
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const year = start.getFullYear();
    // Get ISO week number
    const oneJan = new Date(year, 0, 1);
    const numberOfDays = Math.floor((start.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    return `${year}-W${String(weekNum).padStart(2, "0")}`;
  });

  // Duty Form states
  const [dutyDate, setDutyDate] = useState("");
  const [dutyRouteId, setDutyRouteId] = useState("");
  const [dutyDriverId, setDutyDriverId] = useState("");
  const [dutyVehicleId, setDutyVehicleId] = useState("");
  const [dutyError, setDutyError] = useState("");
  
  // Route Form states
  const [routeCode, setRouteCode] = useState("");
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [routeError, setRouteError] = useState("");

  const fetchRoutes = async () => {
    try {
      setRoutesLoading(true);
      const response = await schedulingApi.listRoutes();
      setRoutes(response.data);
    } catch (err) {
      console.error("Failed to fetch routes", err);
    } finally {
      setRoutesLoading(false);
    }
  };

  const fetchDuties = async () => {
    try {
      setDutiesLoading(true);
      const response = await schedulingApi.listDuties({
        week: selectedWeek,
        depot_id: user?.depot_id || undefined
      });
      setDuties(response.data);
    } catch (err) {
      console.error("Failed to fetch duties", err);
    } finally {
      setDutiesLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    fetchDuties();
  }, [selectedWeek]);

  const handleCreateDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    setDutyError("");

    if (!dutyDate || !dutyRouteId || !dutyDriverId || !dutyVehicleId) {
      setDutyError("Please fill in all assignment fields.");
      return;
    }

    try {
      await schedulingApi.createDuty({
        date: dutyDate,
        routeId: parseInt(dutyRouteId),
        driverId: parseInt(dutyDriverId),
        vehicleId: parseInt(dutyVehicleId)
      });
      
      // Clear form & refresh roster grid
      setDutyDate("");
      setDutyRouteId("");
      setDutyDriverId("");
      setDutyVehicleId("");
      await fetchDuties();
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.detail || "Double-booking scheduling conflict detected by Spring Boot validation.";
      setDutyError(msg);
    }
  };

  const handlePublishDuty = async (id: number) => {
    try {
      await schedulingApi.publishDuty(id);
      await fetchDuties();
    } catch (err) {
      alert("Failed to publish duty.");
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setRouteError("");

    if (!routeCode || !source || !destination) {
      setRouteError("All route fields are required.");
      return;
    }

    try {
      await schedulingApi.createRoute({
        routeCode,
        source,
        destination,
        isActive: true
      });

      setRouteCode("");
      setSource("");
      setDestination("");
      await fetchRoutes();
    } catch (err) {
      setRouteError("Failed to create route network.");
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
      
      {/* Roster Controls Header */}
      <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-md flex flex-wrap gap-4 items-center justify-between shadow-lg">
        
        {/* Navigation Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("duties")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
              activeTab === "duties"
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10"
                : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
          >
            <Grid className="w-4 h-4" />
            DUTY DISPATCH ROSTER
          </button>
          
          <button
            onClick={() => setActiveTab("routes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
              activeTab === "routes"
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10"
                : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
          >
            <Map className="w-4 h-4" />
            ROUTE NETWORKS
          </button>
        </div>

        {/* Datepicker controls only visible on duties grid */}
        {activeTab === "duties" && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Roster Week</span>
            <input
              type="text"
              placeholder="e.g. 2025-W12"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono w-32 text-center"
            />
          </div>
        )}

      </div>

      {/* Tabs panels */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {activeTab === "duties" ? (
          <>
            {/* Left Side Pane — Duty Planner Form */}
            <aside className="w-96 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
              <div className="space-y-5">
                
                <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-slate-200 text-sm tracking-wide">ASSIGN DISPATCH DUTY</h3>
                </div>

                {dutyError && (
                  <div className="p-3.5 bg-rose-950/30 border border-rose-900/40 rounded-xl flex items-start gap-2.5">
                    <AlertOctagon className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-rose-350 leading-relaxed font-mono">{dutyError}</p>
                  </div>
                )}

                <form onSubmit={handleCreateDuty} className="space-y-4">
                  
                  {/* Duty Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Duty Date</label>
                    <input
                      type="date"
                      value={dutyDate}
                      onChange={(e) => setDutyDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  {/* Route Dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Assigned Route</label>
                    <select
                      value={dutyRouteId}
                      onChange={(e) => setDutyRouteId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-2.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500"
                      required
                    >
                      <option value="">Choose Route</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.routeCode} ({r.source} → {r.destination})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Driver ID */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Driver User ID</label>
                    <input
                      type="number"
                      placeholder="e.g. 4"
                      value={dutyDriverId}
                      onChange={(e) => setDutyDriverId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  {/* Vehicle ID */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Vehicle ID</label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={dutyVehicleId}
                      onChange={(e) => setDutyVehicleId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary text-xs font-semibold py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-1.5 shadow-indigo-600/10 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Commit Roster Duty
                  </button>

                </form>
              </div>

              <div className="border-t border-slate-900/80 pt-4 text-center">
                <span className="text-[10px] text-slate-500 italic block">
                  Spring Boot Core Transaction Integrity
                </span>
              </div>
            </aside>

            {/* Right Pane — Duties grid */}
            <section className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-w-0">
              
              <div className="p-4 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 tracking-wider font-semibold">WEEK ROSTER REGISTRY ({duties.length})</span>
                <button 
                  onClick={fetchDuties}
                  className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-750 px-2 py-0.5 rounded text-indigo-400 font-bold"
                >
                  Sync Roster
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                {dutiesLoading && (
                  <div className="py-24 text-center text-slate-500 text-xs">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Querying Java Roster engine...
                  </div>
                )}

                {!dutiesLoading && duties.length === 0 && (
                  <div className="py-24 text-center text-slate-500 text-xs">
                    No duty shifts have been assigned for week {selectedWeek}.
                  </div>
                )}

                {!dutiesLoading && duties.length > 0 && (
                  <table className="w-full text-xs text-left border-collapse text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        <th className="pb-3.5 pl-4">Shift Date</th>
                        <th className="pb-3.5">Route</th>
                        <th className="pb-3.5">Driver Context</th>
                        <th className="pb-3.5">Vehicle ID</th>
                        <th className="pb-3.5">Status</th>
                        <th className="pb-3.5 pr-4 text-right">Roster Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {duties.map(duty => (
                        <tr key={duty.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-4 pl-4 font-mono font-bold text-white">
                            {format(new Date(duty.date), "dd MMM (EEE)")}
                          </td>
                          <td className="py-4 font-mono">
                            <span className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded text-[10px] font-bold">
                              {duty.routeCode}
                            </span>
                          </td>
                          <td className="py-4 font-sans text-slate-200">
                            {duty.driverName || `Driver ID: ${duty.driverId}`}
                          </td>
                          <td className="py-4 font-mono">
                            {duty.vehicleRegNo || `Vehicle ID: ${duty.vehicleId}`}
                          </td>
                          <td className="py-4">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border font-mono uppercase ${
                              duty.status === "acknowledged" ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/40" :
                              duty.status === "published" ? "bg-blue-950/50 text-blue-400 border-blue-800/40" :
                              "bg-slate-850 text-slate-400 border-slate-700"
                            }`}>
                              {duty.status}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-right">
                            {duty.status === "draft" && (
                              <button
                                onClick={() => handlePublishDuty(duty.id)}
                                className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded transition-colors"
                              >
                                Publish Shift
                              </button>
                            )}
                            {duty.status === "published" && (
                              <span className="text-[10px] text-slate-500 italic">Pending Ack</span>
                            )}
                            {duty.status === "acknowledged" && (
                              <span className="text-[10px] text-emerald-500 font-semibold flex items-center justify-end gap-1 font-mono">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Locked
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </section>
          </>
        ) : (
          <>
            {/* Tab 2: Routes Network Roster */}
            {/* Left Side Pane — Route networks Form */}
            <aside className="w-96 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
              <div className="space-y-5">
                
                <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Map className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-slate-200 text-sm tracking-wide">ADD NETWORK ROUTE</h3>
                </div>

                {routeError && (
                  <div className="p-3.5 bg-rose-950/30 border border-rose-900/40 rounded-xl">
                    <p className="text-[10px] text-rose-450 leading-relaxed font-mono">{routeError}</p>
                  </div>
                )}

                <form onSubmit={handleCreateRoute} className="space-y-4">
                  
                  {/* Route Code */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Route Code</label>
                    <input
                      type="text"
                      placeholder="e.g. NCRTC-NCR-3"
                      value={routeCode}
                      onChange={(e) => setRouteCode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  {/* Source Stop */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Source / Depot Station</label>
                    <input
                      type="text"
                      placeholder="e.g. Ghaziabad RRTS"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Destination Stop */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Destination Node</label>
                    <input
                      type="text"
                      placeholder="e.g. Indirapuram Hub"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary text-xs font-semibold py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-1.5 shadow-indigo-600/10 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Inject Network Route
                  </button>

                </form>
              </div>

              <div className="border-t border-slate-900/80 pt-4 text-center">
                <span className="text-[10px] text-slate-500 italic block">
                  Regional Transit Feeder networks
                </span>
              </div>
            </aside>

            {/* Right Pane — Routes Network Roster Grid */}
            <section className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-w-0">
              
              <div className="p-4 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 tracking-wider font-semibold">FEEDER ACTIVE NETWORKS ({routes.length})</span>
                <button 
                  onClick={fetchRoutes}
                  className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-750 px-2 py-0.5 rounded text-indigo-400 font-bold"
                >
                  Refresh Networks
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {routesLoading ? (
                  <div className="py-24 text-center text-slate-500 text-xs animate-pulse">
                    Querying routing network map...
                  </div>
                ) : routes.length === 0 ? (
                  <div className="py-24 text-center text-slate-500 text-xs">
                    No active transit networks exist in the database.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {routes.map(r => (
                      <div 
                        key={r.id} 
                        className="bg-slate-900 border border-slate-850 p-4.5 rounded-xl space-y-3.5 relative overflow-hidden group hover:border-slate-700 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                            {r.routeCode}
                          </span>
                          <span className="text-[9px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-1.5 rounded">
                            ACTIVE
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-300 font-sans">
                          <p className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            Source: <strong className="text-slate-100">{r.source}</strong>
                          </p>
                          <p className="flex items-center gap-2">
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            Dest: <strong className="text-slate-100">{r.destination}</strong>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </section>
          </>
        )}

      </div>

    </div>
  );
}
