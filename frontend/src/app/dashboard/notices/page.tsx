"use client";

import { useEffect, useState } from "react";
import { noticeApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { 
  FileText, 
  Send, 
  Users, 
  Clock, 
  AlertCircle, 
  Bell, 
  CheckCircle,
  Eye,
  Calendar,
  Layers,
  Inbox
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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
  read_count?: number;
}

interface ReadReceipt {
  user_id: number;
  username: string;
  full_name: string;
  read_at: string;
}

export default function NoticesPage() {
  const { user } = useAuthStore();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audienceRole, setAudienceRole] = useState<"driver" | "conductor" | "all">("all");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [depotId, setDepotId] = useState("");
  const [expiresDays, setExpiresDays] = useState("7");

  // Selected notice for receipts audit
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const response = await noticeApi.list();
      setNotices(response.data);
      
      // Update selected notice stats if active
      if (selectedNotice) {
        const updated = response.data.find((n: Notice) => n.id === selectedNotice.id);
        if (updated) {
          setSelectedNotice(updated);
          await fetchReadReceipts(updated.id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch notices", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReadReceipts = async (id: number) => {
    try {
      setReceiptsLoading(true);
      const response = await noticeApi.reads(id);
      setReadReceipts(response.data);
    } catch (err) {
      console.error("Failed to load read receipts", err);
    } finally {
      setReceiptsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleSelectNotice = async (notice: Notice) => {
    setSelectedNotice(notice);
    await fetchReadReceipts(notice.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    try {
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresDays));

      await noticeApi.create({
        title,
        content,
        audience_role: audienceRole,
        priority,
        depot_id: depotId ? parseInt(depotId) : null,
        expires_at: expiresAt.toISOString(),
      });

      // Reset form
      setTitle("");
      setContent("");
      setAudienceRole("all");
      setPriority("medium");
      setDepotId("");
      setExpiresDays("7");
      
      await fetchNotices();
    } catch (err) {
      alert("Failed to publish notice. Check input fields.");
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
      
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Left Side Pane — Compose Broadcast Notice */}
        <aside className="w-96 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-5">
            
            <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="font-bold text-slate-200 text-sm tracking-wide">BROADCAST NOTICE</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Notice Title */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Notice Title</label>
                <input
                  type="text"
                  placeholder="e.g. Rerouting near Noida Sector 62"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Notice Content */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Notice Content</label>
                <textarea
                  placeholder="Provide precise details regarding route changes, weather alerts, or operational briefings..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans resize-none"
                  required
                />
              </div>

              {/* Grid 2-cols */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* Priority */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="low">LOW</option>
                    <option value="medium">MEDIUM</option>
                    <option value="high">HIGH (P1)</option>
                  </select>
                </div>

                {/* Target Role */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Target Role</label>
                  <select
                    value={audienceRole}
                    onChange={(e) => setAudienceRole(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="all">ALL STAFF</option>
                    <option value="driver">DRIVERS</option>
                    <option value="conductor">CONDUCTORS</option>
                  </select>
                </div>

              </div>

              {/* Grid 2-cols */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* Depot filter optional */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Depot ID (Opt)</label>
                  <input
                    type="number"
                    placeholder="Global (Leave Blank)"
                    value={depotId}
                    onChange={(e) => setDepotId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Expiry Days */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Lifespan</label>
                  <select
                    value={expiresDays}
                    onChange={(e) => setExpiresDays(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="1">1 DAY</option>
                    <option value="3">3 DAYS</option>
                    <option value="7">7 DAYS</option>
                    <option value="30">30 DAYS</option>
                  </select>
                </div>

              </div>

              <button
                type="submit"
                className="w-full btn-primary text-xs font-semibold py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-1.5 shadow-indigo-600/10 mt-2"
              >
                <Send className="w-3.5 h-3.5" />
                Publish Roster Notice
              </button>

            </form>
          </div>

          <div className="border-t border-slate-900/80 pt-4 text-center">
            <span className="text-[10px] text-slate-500 italic block">
              Authorized Broadcast Area · Logger V1.0
            </span>
          </div>
        </aside>

        {/* Center Pane — Notices Broadcast Feed */}
        <section className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-w-0">
          
          <div className="p-4 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 tracking-wider font-semibold">NOTICES BROADCAST FEED ({notices.length})</span>
            <button 
              onClick={fetchNotices}
              className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-750 px-2 py-0.5 rounded text-indigo-400 font-bold"
            >
              Sync Feed
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading && (
              <div className="py-20 text-center text-slate-500 text-xs">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading communications feed...
              </div>
            )}

            {!loading && notices.length === 0 && (
              <div className="py-20 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
                <Inbox className="w-10 h-10 text-slate-700 animate-bounce" />
                <p>Broadcast feed is empty. Publish your first notice!</p>
              </div>
            )}

            {notices.map(notice => {
              const isSelected = selectedNotice?.id === notice.id;
              
              return (
                <button
                  key={notice.id}
                  onClick={() => handleSelectNotice(notice)}
                  className={`w-full text-left p-5 rounded-xl border transition-all duration-200 group flex flex-col gap-3 ${
                    isSelected
                      ? "bg-indigo-950/15 border-indigo-500/60 shadow-lg"
                      : "bg-slate-900/50 border-slate-850 hover:bg-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className="w-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        notice.priority === "high" ? "bg-rose-500 animate-pulse-slow shadow-lg shadow-rose-500" :
                        notice.priority === "medium" ? "bg-amber-500" :
                        "bg-slate-500"
                      }`} />
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                        {notice.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Read count receipt badge */}
                      <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 rounded-md flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {notice.read_count || 0} read
                      </span>

                      {/* Scope Badge */}
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border font-mono uppercase ${
                        notice.priority === "high" ? "bg-rose-950/50 text-rose-400 border-rose-800/40" :
                        notice.priority === "medium" ? "bg-amber-950/50 text-amber-400 border-amber-800/40" :
                        "bg-slate-850 text-slate-400 border-slate-700"
                      }`}>
                        {notice.priority}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-350 leading-relaxed whitespace-pre-wrap font-sans">
                    {notice.content}
                  </p>

                  <div className="w-full flex flex-wrap items-center justify-between border-t border-slate-850 pt-3 text-[10px] text-slate-500 font-mono gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Users className="w-3.5 h-3.5 text-slate-600" />
                        Audience: <strong className="text-slate-300 uppercase">{notice.audience_role}</strong>
                      </span>
                      {notice.depot_id && (
                        <span className="text-slate-400">
                          Depot Scope: <strong className="text-slate-300">#{notice.depot_id}</strong>
                        </span>
                      )}
                    </div>
                    <span>
                      Broadcasted: {formatDistanceToNow(new Date(notice.created_at))} ago
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

        </section>

        {/* Right Pane — Read Receipts Audit Terminal */}
        <aside className="w-80 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 shadow-2xl flex flex-col justify-between overflow-y-auto">
          
          {selectedNotice ? (
            <div className="space-y-6 h-full flex flex-col justify-between">
              
              <div className="space-y-5 flex-1 flex flex-col">
                
                {/* Header audit */}
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      READ AUDIT LOG
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {selectedNotice.read_count || 0} Total
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{selectedNotice.title}</h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold font-mono mt-0.5">Notice ID: #{selectedNotice.id}</p>
                </div>

                {/* Audit Grid */}
                <div className="flex-1 flex flex-col min-h-0">
                  <h5 className="text-xs font-semibold text-slate-400 tracking-wider font-mono uppercase mb-3">ACKNOWLEDGED STAFF</h5>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {receiptsLoading ? (
                      <div className="py-8 text-center text-slate-500 text-[10px] font-mono animate-pulse">
                        Querying DB receipts...
                      </div>
                    ) : readReceipts.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs font-sans italic">
                        No read logs recorded yet.
                      </div>
                    ) : (
                      readReceipts.map(receipt => (
                        <div 
                          key={receipt.user_id} 
                          className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl text-xs space-y-1.5 flex flex-col"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200 truncate">{receipt.full_name}</span>
                            <span className="text-[9px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-1.5 rounded">
                              READ
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>ID: #{receipt.user_id} (@{receipt.username})</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {format(new Date(receipt.read_at), "hh:mm a")}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Visual disclaimer */}
              <div className="border-t border-slate-900 pt-4 text-center">
                <span className="text-[10px] text-slate-500 italic block leading-none">
                  Legal compliance receipt log · NCRTC CMS
                </span>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-3 py-20">
              <FileText className="w-12 h-12 text-slate-700 animate-pulse" />
              <div>
                <p className="text-slate-400 text-sm font-semibold">CMS Receipts Auditor</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs font-sans">
                  Select any published notice in the broadcast feed to inspect user read logs, timestamps, and compliance coverage statistics.
                </p>
              </div>
            </div>
          )}

        </aside>

      </div>

    </div>
  );
}
