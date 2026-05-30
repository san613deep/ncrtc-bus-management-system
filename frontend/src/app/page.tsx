"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

/** Root page — redirect based on auth state */
export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (user?.role === "driver" || user?.role === "conductor") {
      router.replace("/driver");
    } else {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-gray-500 text-sm">Loading NCRTC BMS...</p>
      </div>
    </div>
  );
}
