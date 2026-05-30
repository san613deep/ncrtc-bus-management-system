/**
 * store/authStore.ts — Zustand Auth State
 * =========================================
 * Global state for the currently logged-in user.
 * 
 * WHY Zustand instead of React Context?
 * - Simpler API — no Provider wrapper needed
 * - No re-render storms — components only re-render when the slice they use changes
 * - Persist to localStorage easily for "remember me" behavior
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: "driver" | "conductor" | "depot_manager" | "control_operator" | "admin";
  depot_id: number | null;
  phone: string | null;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user: User, token: string) => {
        // Store token in localStorage for axios interceptor
        localStorage.setItem("ncrtc_token", token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem("ncrtc_token");
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates: Partial<User>) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "ncrtc-auth",          // localStorage key
      partialize: (state) => ({    // Only persist these fields
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ---------------------------------------------------------------
// Role-based helper hooks — use these in components
// ---------------------------------------------------------------

export const useIsAdmin = () => {
  const user = useAuthStore((s) => s.user);
  return user?.role === "admin";
};

export const useIsManager = () => {
  const user = useAuthStore((s) => s.user);
  return user?.role === "depot_manager" || user?.role === "admin";
};

export const useIsDriver = () => {
  const user = useAuthStore((s) => s.user);
  return user?.role === "driver" || user?.role === "conductor";
};

export const useCanSeeAllDepots = () => {
  const user = useAuthStore((s) => s.user);
  return user?.role === "admin" || user?.role === "control_operator";
};
