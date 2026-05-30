"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { LogOut, Shield, User, Bus } from "lucide-react";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (user?.role !== "driver" && user?.role !== "conductor") {
      // Direct operators back to desktop dashboard
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Verifying driver credentials...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start py-0 md:py-6 px-0 sm:px-4 font-sans select-none">
      
      {/* PWA / Mobile Container frame on larger screens */}
      <div className="w-full max-w-md min-h-screen md:min-h-[850px] md:max-h-[900px] bg-slate-900 border-0 md:border md:border-slate-800 md:rounded-3xl shadow-2xl overflow-y-auto flex flex-col justify-between relative">
        
        {/* Mobile Header bar */}
        <header className="px-5 py-4 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow shadow-indigo-500/30">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xs font-bold text-slate-100 font-mono tracking-wider">NCRTC PWA</h1>
              <span className="text-[9px] text-indigo-400 font-semibold uppercase leading-none block">Driver Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="text-[10px] text-slate-400 hover:text-white bg-slate-900 border border-slate-850 px-2 py-1 rounded-lg flex items-center gap-1 font-bold"
            >
              <LogOut className="w-3 h-3 text-rose-500" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Primary PWA Page Content */}
        <main className="flex-1 p-5 relative overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950">
          {children}
        </main>

        {/* Mobile Footer bar */}
        <footer className="px-5 py-3 border-t border-slate-850 bg-slate-950 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-indigo-500" />
            <span>Driver: <strong className="text-slate-350">{user.full_name}</strong></span>
          </div>
          <div>
            <span>Depot #{user.depot_id || "ALL"}</span>
          </div>
        </footer>

      </div>

    </div>
  );
}
