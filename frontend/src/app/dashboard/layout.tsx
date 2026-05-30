"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { 
  Bus, 
  Map, 
  Calendar, 
  AlertTriangle, 
  FileText, 
  LogOut, 
  User as UserIcon,
  Shield,
  Activity
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (user?.role === "driver" || user?.role === "conductor") {
      router.replace("/driver");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navItems = [
    {
      name: "Live Tracking",
      path: "/dashboard",
      icon: Map,
      roles: ["admin", "depot_manager", "control_operator"],
    },
    {
      name: "Scheduling & Duties",
      path: "/dashboard/scheduling",
      icon: Calendar,
      roles: ["admin", "depot_manager", "control_operator"],
    },
    {
      name: "Incident Control",
      path: "/dashboard/incidents",
      icon: AlertTriangle,
      roles: ["admin", "depot_manager", "control_operator"],
    },
    {
      name: "Notice Board (CMS)",
      path: "/dashboard/notices",
      icon: FileText,
      roles: ["admin", "depot_manager"],
    },
  ];

  // Filter navigation items by role
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100 font-sans">
      
      {/* Sidebar */}
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Logo Header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                NCRTC BMS
              </h1>
              <span className="text-[10px] text-blue-400 tracking-wider font-semibold uppercase">
                Feeder Operations
              </span>
            </div>
          </div>

          {/* System Status Tracker */}
          <div className="px-6 py-4 border-b border-slate-900/50 bg-slate-950/40">
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs text-slate-400 font-medium">Operations Center</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                API V1.0
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600/90 to-indigo-600/80 text-white shadow-md shadow-blue-500/10"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile + Logout Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl mb-3 shadow-inner">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                <p className="text-[10px] text-slate-400 truncate capitalize">{user.role.replace("_", " ")}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-red-950/20 hover:border-red-900/50 transition-all duration-200 text-xs font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-slate-950/40 border-b border-slate-800/50 backdrop-blur-md px-8 flex items-center justify-between z-10">
          <div>
            <h2 className="text-sm font-semibold text-slate-400 font-mono">
              {pathname === "/dashboard" && "LIVE VEHICLE VISUALIZER"}
              {pathname === "/dashboard/scheduling" && "ROSTER & DISPATCH CONTROL"}
              {pathname === "/dashboard/incidents" && "INCIDENT WORKFLOW CONTROL"}
              {pathname === "/dashboard/notices" && "COMMUNICATION PORTAL (CMS)"}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-xs font-medium text-slate-400 border-r border-slate-800 pr-6">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>MySQL Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>Postgres Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>Redis Syncing</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-bold">Current Depot</span>
                <span className="text-xs text-slate-200 font-medium font-mono">
                  {user.depot_id ? `DEPOT #${user.depot_id}` : "GLOBAL OPERATOR"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto bg-slate-900/90 relative p-8">
          {children}
        </main>
      </div>

    </div>
  );
}
