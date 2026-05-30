"use client";

import { useEffect, useState } from "react";
import { schedulingApi, noticeApi, incidentApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { 
  Bus, 
  AlertTriangle, 
  Bell, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Info, 
  Send,
  Loader2,
  AlertOctagon,
  Eye,
  Zap,
  HelpCircle,
  FileText
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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

interface Notice {
  id: number;
  title: string;
  content: string;
  audience_role: "driver" | "conductor" | "all";
  priority: "low" | "medium" | "high";
  depot_id: number | null;
  created_at: string;
  expires_at: string | null;
  created_by: number;
  author_name?: string;
  is_read?: boolean;
}

export default function DriverDashboardPage() {
  const { user } = useAuthStore();
  
  // Dashboard states
  const [duties, setDuties] = useState<Duty[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Panic Modal states
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [panicNote, setPanicNote] = useState("Engine Breakdown");
  const [panicCustomNote, setPanicCustomNote] = useState("");
  const [panicSuccess, setPanicSuccess] = useState(false);

  // Active Notice view modal states
  const [viewNotice, setViewNotice] = useState<Notice | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch driver's assigned shifts
      const dutyResponse = await schedulingApi.myDuties();
      setDuties(dutyResponse.data);

      // Fetch broadcast notices board
      const noticeResponse = await noticeApi.list();
      setNotices(noticeResponse.data);
    } catch (err) {
      console.error("Failed to load driver dashboard metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Precompute today's active shift
  const activeDuty = duties.find(d => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return d.date === todayStr;
  }) || duties[0]; // fallback to next upcoming duty if none matches exactly today

  const handleAcknowledgeDuty = async (id: number) => {
    try {
      setActionLoading(true);
      await schedulingApi.ackDuty(id);
      await fetchDashboardData();
    } catch (err) {
      alert("Failed to acknowledge shift assignment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcknowledgeNotice = async (id: number) => {
    try {
      setActionLoading(true);
      await noticeApi.ack(id);
      setViewNotice(null);
      await fetchDashboardData();
    } catch (err) {
      alert("Failed to mark notice as read.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerPanic = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fallback vehicle context from duty shift, or default to vehicle ID 1
    const vehicleId = activeDuty ? activeDuty.vehicleId : 1;
    const finalNote = panicNote === "Other" ? panicCustomNote : panicNote;

    try {
      setActionLoading(true);
      await incidentApi.panic({
        vehicle_id: vehicleId,
        note: finalNote || "Vehicle P1 breakdown panic signal triggered."
      });
      setPanicSuccess(true);
      setTimeout(() => {
        setShowPanicModal(false);
        setPanicSuccess(false);
        setPanicCustomNote("");
      }, 3500);
    } catch (err) {
      alert("Failed to dispatch panic signal.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20 text-slate-500 text-xs">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="font-mono mt-2">Loading terminal logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 🚨 PULSING PANIC BUTTON BAR */}
      <div className="bg-slate-950/60 border border-slate-850 p-4.5 rounded-2xl text-center space-y-3.5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
        
        <div>
          <h2 className="text-xs font-bold font-mono tracking-wider text-rose-400">EMERGENCY OPERATIONS SIGNAL</h2>
          <p className="text-[10px] text-slate-400 font-sans mt-0.5">
            Instantly dispatch an urgent breakdown breakdown ticket to operator dashboard.
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => setShowPanicModal(true)}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 border-4 border-red-950 flex flex-col items-center justify-center shadow-lg shadow-red-900/40 relative active:scale-95 transition-all outline-none"
          >
            {/* Pulsing ring */}
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-20"></span>
            <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
            <span className="text-[9px] font-extrabold text-white font-mono uppercase tracking-wider mt-1">
              PANIC
            </span>
          </button>
        </div>
      </div>

      {/* TODAY'S SHIFT CARD */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          Today's Assigned Duty Shift
        </h3>

        {activeDuty ? (
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 text-indigo-400 uppercase">
                  ACTIVE NETWORK {activeDuty.routeCode}
                </span>
                <h4 className="text-sm font-bold text-white mt-1.5 font-mono">
                  {format(new Date(activeDuty.date), "dd MMMM yyyy")}
                </h4>
              </div>

              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border font-mono uppercase ${
                activeDuty.status === "acknowledged" ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/40" :
                activeDuty.status === "published" ? "bg-blue-950/50 text-blue-400 border-blue-800/40" :
                "bg-slate-850 text-slate-400 border-slate-700"
              }`}>
                {activeDuty.status}
              </span>
            </div>

            {/* Visual routing info */}
            <div className="space-y-2 text-xs border-t border-b border-slate-850 py-3 text-slate-300 font-sans">
              <p className="flex items-center gap-2">
                <Bus className="w-4 h-4 text-indigo-400" />
                Vehicle Context: <strong className="text-white font-mono">{activeDuty.vehicleRegNo || `ID #${activeDuty.vehicleId}`}</strong>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-550" />
                Network Path: <strong className="text-white">Depot Feed Route</strong>
              </p>
            </div>

            {/* Shift Acknowledger logic */}
            {activeDuty.status === "published" ? (
              <button
                onClick={() => handleAcknowledgeDuty(activeDuty.id)}
                disabled={actionLoading}
                className="w-full btn-primary text-xs font-bold py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-1.5"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Acknowledge Shift Assignment
              </button>
            ) : activeDuty.status === "acknowledged" ? (
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-[11px] text-slate-400 font-sans">
                  This duty shift is acknowledged. Present yourself at the depot.
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 text-center italic">
                Roster shift draft stage — wait for operational publication.
              </p>
            )}

          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl text-center text-xs text-slate-400 font-sans italic">
            You have no assigned duties scheduled for today.
          </div>
        )}
      </section>

      {/* NOTICES LIST */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1">
          <Bell className="w-3.5 h-3.5 text-indigo-400" />
          Active Notices & Bulletins
        </h3>

        <div className="space-y-2">
          {notices.length === 0 ? (
            <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl text-center text-xs text-slate-400 italic">
              No bulletins published on the board.
            </div>
          ) : (
            notices.map(notice => (
              <button
                key={notice.id}
                onClick={() => setViewNotice(notice)}
                className="w-full text-left p-4 bg-slate-900 border border-slate-850 rounded-xl flex items-start justify-between gap-3 hover:bg-slate-900/80 active:scale-98 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      notice.priority === "high" ? "bg-rose-500 animate-pulse" :
                      notice.priority === "medium" ? "bg-amber-500" :
                      "bg-slate-500"
                    }`} />
                    <h4 className="text-xs font-bold text-slate-100 truncate">{notice.title}</h4>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-1 line-clamp-1">
                    {notice.content}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[9px] text-slate-500 font-mono">
                    {formatDistanceToNow(new Date(notice.created_at))}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {/* 🚨 PANIC MODAL DIALOG */}
      {showPanicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm z-[9999]">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-4">
            
            {panicSuccess ? (
              <div className="py-8 text-center space-y-3.5 animate-pulse">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-500">
                  <AlertOctagon className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-400 font-mono">SIGNAL DISPATCHED</h4>
                  <p className="text-[10px] text-slate-450 mt-1.5">
                    Operations control room is notified. Emergency assistance team is active.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-sm">🚨 Dispatch Emergency Signal</h3>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Pre-fills vehicle coordinates</p>
                  </div>
                  <button 
                    onClick={() => setShowPanicModal(false)}
                    className="text-xs text-slate-500 hover:text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleTriggerPanic} className="space-y-4">
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Emergency Category</label>
                    <select
                      value={panicNote}
                      onChange={(e) => setPanicNote(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Engine Breakdown">Engine Breakdown / Mechanical</option>
                      <option value="Flat Tire">Flat Tire / Suspension</option>
                      <option value="Medical Emergency">Medical Distress / Passenger Injury</option>
                      <option value="Accident / Collision">Vehicle Collision / Accident</option>
                      <option value="Other">Other Distress (Specify Below)</option>
                    </select>
                  </div>

                  {panicNote === "Other" && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Emergency Detail Notes</label>
                      <input
                        type="text"
                        placeholder="Provide details..."
                        value={panicCustomNote}
                        onChange={(e) => setPanicCustomNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-900/40"
                  >
                    Broadcast P1 Panic Alert
                  </button>

                </form>
              </>
            )}

          </div>
        </div>
      )}

      {/* 📬 VIEW NOTICE MODAL */}
      {viewNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm z-[9999]">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                viewNotice.priority === "high" ? "bg-rose-950 text-rose-400 border-rose-800/40" :
                "bg-slate-800 text-slate-400 border-slate-700"
              }`}>
                Priority {viewNotice.priority}
              </span>
              
              <button 
                onClick={() => setViewNotice(null)}
                className="text-xs text-slate-500 hover:text-slate-300 font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-white text-sm leading-tight">{viewNotice.title}</h3>
              <p className="text-[10px] text-slate-500 font-mono">
                Issued: {format(new Date(viewNotice.created_at), "dd MMM hh:mm a")}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl">
              <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {viewNotice.content}
              </p>
            </div>

            <button
              onClick={() => handleAcknowledgeNotice(viewNotice.id)}
              disabled={actionLoading}
              className="w-full btn-primary text-xs font-bold py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-1.5"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Acknowledge Bulletin / Mark Read
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
