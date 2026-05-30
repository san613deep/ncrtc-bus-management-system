"use client";

import { useEffect, useState } from "react";
import { incidentApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { 
  AlertTriangle, 
  Search, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  Sparkles,
  HelpCircle,
  FileText,
  AlertOctagon,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { format, formatDistanceToNow, isAfter } from "date-fns";

interface Incident {
  id: number;
  type: string;
  severity: "P1" | "P2" | "P3";
  status: "open" | "acknowledged" | "in_progress" | "resolved" | "closed";
  description: string;
  photo_url: string | null;
  vehicle_id: number;
  depot_id: number;
  created_at: string;
  sla_deadline: string;
  raiser_name: string;
  assigned_to?: number;
}

interface IncidentEvent {
  id: number;
  incident_id: number;
  actor_id: number;
  actor_name?: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
}

export default function IncidentControlPage() {
  const { user } = useAuthStore();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Selected incident details
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<IncidentEvent[]>([]);
  const [actionNote, setActionNote] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await incidentApi.list();
      setIncidents(response.data);
      
      // Update selected incident if it was active
      if (selectedIncident) {
        const updated = response.data.find((inc: Incident) => inc.id === selectedIncident.id);
        if (updated) {
          setSelectedIncident(updated);
          await fetchTimeline(updated.id);
        }
      }
    } catch (err) {
      console.error("Failed to load incidents", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async (id: number) => {
    try {
      const response = await incidentApi.get(id);
      // Timeline events are inside the response.data.events
      setSelectedTimeline(response.data.events || []);
    } catch (err) {
      console.error("Failed to load timeline", err);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleSelectIncident = async (incident: Incident) => {
    setSelectedIncident(incident);
    setActionNote("");
    setAssigneeId("");
    await fetchTimeline(incident.id);
  };

  // Status transitions based on state machine
  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "open": return "acknowledged";
      case "acknowledged": return "in_progress";
      case "in_progress": return "resolved";
      case "resolved": return "closed";
      default: return null;
    }
  };

  const getStatusActionLabel = (currentStatus: string) => {
    switch (currentStatus) {
      case "open": return "Acknowledge Incident";
      case "acknowledged": return "Start Resolution";
      case "in_progress": return "Resolve Incident";
      case "resolved": return "Close Incident & Archive";
      default: return "";
    }
  };

  const handleStatusTransition = async () => {
    if (!selectedIncident) return;
    const nextStatus = getNextStatus(selectedIncident.status);
    if (!nextStatus) return;

    try {
      await incidentApi.updateStatus(selectedIncident.id, {
        to_status: nextStatus,
        note: actionNote || `Status updated to ${nextStatus}`
      });
      setActionNote("");
      await fetchIncidents();
    } catch (err) {
      alert("Failed to update status. Check permissions or state rules.");
    }
  };

  const handleAssignIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !assigneeId) return;

    try {
      await incidentApi.assign(selectedIncident.id, {
        assigned_to_id: parseInt(assigneeId),
        note: actionNote || `Assigned to user ID ${assigneeId}`
      });
      setAssigneeId("");
      setActionNote("");
      await fetchIncidents();
    } catch (err) {
      alert("Failed to assign incident.");
    }
  };

  // Filtered list computed
  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = inc.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inc.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" || inc.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || inc.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
      
      {/* Search & Filters */}
      <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search incidents type / logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters Combo */}
        <div className="flex gap-4 w-full md:w-auto">
          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 py-1.5 px-3 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="all">ALL STATUSES</option>
              <option value="open">OPEN (UNRESOLVED)</option>
              <option value="acknowledged">ACKNOWLEDGED</option>
              <option value="in_progress">IN PROGRESS</option>
              <option value="resolved">RESOLVED</option>
              <option value="closed">CLOSED</option>
            </select>
          </div>

          {/* Severity filter */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 py-1.5 px-3 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="all">ALL SEVERITIES</option>
              <option value="P1">P1 - CRITICAL</option>
              <option value="P2">P2 - HIGH</option>
              <option value="P3">P3 - ROUTINE</option>
            </select>
          </div>
        </div>

      </div>

      {/* Roster & Workspace Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Left Side Pane — Scrollable Incidents List */}
        <aside className="w-1/2 bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          
          <div className="p-4 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 tracking-wider font-semibold">INCIDENT ROSTER ({filteredIncidents.length})</span>
            <button 
              onClick={fetchIncidents}
              className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-750 px-2 py-0.5 rounded text-indigo-400 font-bold"
            >
              Force Sync
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && (
              <div className="py-20 text-center text-slate-500 text-xs">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Querying Incident database...
              </div>
            )}

            {!loading && filteredIncidents.length === 0 && (
              <div className="py-20 text-center text-slate-500 text-xs">
                No active incidents matched the filters.
              </div>
            )}

            {filteredIncidents.map(inc => {
              const isSelected = selectedIncident?.id === inc.id;
              
              // Compute if SLA is breached
              const isBreached = !["resolved", "closed"].includes(inc.status) && 
                                 isAfter(new Date(), new Date(inc.sla_deadline));
              
              return (
                <button
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group flex flex-col gap-3 ${
                    isSelected
                      ? "bg-indigo-950/15 border-indigo-500/60 shadow-lg shadow-indigo-950/10"
                      : isBreached
                        ? "bg-rose-950/5 border-rose-900/30 hover:border-rose-800"
                        : "bg-slate-900/50 border-slate-850 hover:bg-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${
                        inc.severity === "P1" ? "text-rose-500" :
                        inc.severity === "P2" ? "text-amber-500" :
                        "text-emerald-500"
                      }`} />
                      <span className="text-xs font-mono font-bold text-slate-200">
                        INCIDENT #{inc.id} · <span className="capitalize">{inc.type}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isBreached && (
                        <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-md animate-pulse">
                          SLA BREACH
                        </span>
                      )}
                      
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border font-mono uppercase ${
                        inc.status === "open" ? "bg-slate-850 text-slate-300 border-slate-700" :
                        inc.status === "acknowledged" ? "bg-blue-950/50 text-blue-400 border-blue-900/40" :
                        inc.status === "in_progress" ? "bg-amber-950/50 text-amber-400 border-amber-900/40" :
                        inc.status === "resolved" ? "bg-emerald-950/50 text-emerald-400 border-emerald-900/40" :
                        "bg-slate-900 text-slate-500 border-slate-850"
                      }`}>
                        {inc.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2">
                    {inc.description}
                  </p>

                  <div className="w-full flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-600" />
                      Raiser: {inc.raiser_name}
                    </span>
                    <span>
                      Raised: {formatDistanceToNow(new Date(inc.created_at))} ago
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

        </aside>

        {/* Right Side Pane — Incident Details & Timelines */}
        <div className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
          
          {selectedIncident ? (
            <div className="space-y-6">
              
              {/* Header Box */}
              <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                      selectedIncident.severity === "P1" ? "bg-rose-950/50 text-rose-400 border-rose-800/40" :
                      selectedIncident.severity === "P2" ? "bg-amber-950/50 text-amber-400 border-amber-800/40" :
                      "bg-emerald-950/50 text-emerald-400 border-emerald-800/40"
                    }`}>
                      {selectedIncident.severity} Severity
                    </span>
                    
                    <span className="text-[10px] text-slate-500 font-mono">
                      Depot Scope: #{selectedIncident.depot_id}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white leading-tight capitalize">
                    {selectedIncident.type} Incident #{selectedIncident.id}
                  </h3>
                </div>

                <div className="text-right font-mono">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">SLA Deadline</p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {format(new Date(selectedIncident.sla_deadline), "dd MMM hh:mm a")}
                  </p>
                </div>
              </div>

              {/* Description Body */}
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider block">Description Log</span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">{selectedIncident.description}</p>
                
                {selectedIncident.photo_url && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-slate-850 bg-slate-950 max-w-xs">
                    <img 
                      src={`http://localhost:8000${selectedIncident.photo_url}`} 
                      alt="Incident Snapshot" 
                      className="w-full object-cover" 
                    />
                  </div>
                )}
              </div>

              {/* Device and Vehicle Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">Raised Timestamp</span>
                    <span className="text-xs text-slate-300 font-mono">
                      {format(new Date(selectedIncident.created_at), "dd/MM/yyyy hh:mm:ss a")}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">Assigned Vehicle</span>
                    <span className="text-xs text-indigo-400 font-mono font-bold">
                      VEHICLE #{selectedIncident.vehicle_id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Strict Workflow Controller */}
              <div className="border-t border-slate-800 pt-5 space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 tracking-wider font-mono uppercase">Incident Resolution Workflow</h4>
                
                <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl space-y-4">
                  {/* Action status message */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Current Status: <strong className="text-slate-200 capitalize font-mono">{selectedIncident.status}</strong></span>
                    {getNextStatus(selectedIncident.status) && (
                      <span className="flex items-center gap-1 font-mono text-indigo-400">
                        Next: {getNextStatus(selectedIncident.status)}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Notes input */}
                  {getNextStatus(selectedIncident.status) && (
                    <div>
                      <input
                        type="text"
                        placeholder="Add resolution or timeline notes..."
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {/* Button Trigger */}
                  {getNextStatus(selectedIncident.status) ? (
                    <button
                      onClick={handleStatusTransition}
                      className="w-full btn-primary text-xs font-bold py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {getStatusActionLabel(selectedIncident.status)}
                    </button>
                  ) : (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <p className="text-xs text-slate-400 font-sans">
                        This incident has completed its lifecycle and is fully <strong className="text-emerald-400 font-mono">CLOSED</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Roster Assignment Panel */}
              {selectedIncident.status !== "closed" && (
                <div className="border-t border-slate-800 pt-5 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-400 tracking-wider font-mono uppercase">Re-Assign Incident Handler</h4>
                  
                  <form onSubmit={handleAssignIncident} className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Handler User ID</label>
                      <input
                        type="number"
                        placeholder="Handler ID (e.g. 2)"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-secondary text-xs h-9 rounded-xl px-4 flex items-center gap-1 font-semibold border-slate-850 hover:bg-slate-900"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Dispatch
                    </button>
                  </form>
                </div>
              )}

              {/* Chronological Timeline History */}
              <div className="border-t border-slate-800 pt-5 space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 tracking-wider font-mono uppercase">Audit Timeline Logging</h4>
                
                <div className="space-y-4 pl-3 relative border-l-2 border-slate-850">
                  {selectedTimeline.map((event, idx) => (
                    <div key={event.id || idx} className="relative pl-4 space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-slate-950 group-hover:bg-indigo-500" />
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500">
                          {format(new Date(event.created_at), "dd MMM hh:mm a")}
                        </span>
                        
                        <span className="text-[9px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded uppercase">
                          {event.to_status}
                        </span>
                        
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-0.5">
                          <User className="w-3 h-3 text-slate-500" />
                          Actor: ID {event.actor_id}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 font-sans pl-0.5 italic">
                        "{event.note || "No comments log recorded"}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-3 py-20">
              <AlertOctagon className="w-12 h-12 text-slate-700 animate-pulse" />
              <div>
                <p className="text-slate-400 text-sm font-semibold">Incident Detail Terminal</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs font-sans">
                  Select an incident from the log roster to manage status transitions, verify SLA deadlines, and audit history.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
