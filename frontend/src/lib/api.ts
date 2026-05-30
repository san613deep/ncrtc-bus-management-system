/**
 * lib/api.ts — Axios API Client
 * ================================
 * Centralizes all API calls. Benefits:
 * 1. One place to set the base URL
 * 2. Request interceptor: auto-attaches JWT token to every request
 * 3. Response interceptor: handles 401 (token expired) globally
 */

import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,  // 15 second timeout
});

// ---------------------------------------------------------------
// Request Interceptor — attach JWT token to every request
// ---------------------------------------------------------------
api.interceptors.request.use((config) => {
  // Read token from memory (zustand store prefers memory over localStorage)
  // We use localStorage here as a fallback for page refresh persistence
  const token = typeof window !== "undefined"
    ? localStorage.getItem("ncrtc_token")
    : null;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------
// Response Interceptor — global error handling
// ---------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("ncrtc_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------
// Typed API Functions — import these in components
// ---------------------------------------------------------------

export const authApi = {
  login: (username: string, password: string) =>
    api.post("/auth/login", { username, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

export const vehicleApi = {
  getLive: (depotId?: number) =>
    api.get("/vehicles/live", { params: depotId ? { depot_id: depotId } : {} }),
  getHistory: (vehicleId: number, date: string) =>
    api.get(`/vehicles/${vehicleId}/history`, { params: { date } }),
};

export const incidentApi = {
  list: (params?: object) => api.get("/incidents", { params }),
  create: (data: object) => api.post("/incidents", data),
  get: (id: number) => api.get(`/incidents/${id}`),
  updateStatus: (id: number, data: object) => api.patch(`/incidents/${id}/status`, data),
  assign: (id: number, data: object) => api.patch(`/incidents/${id}/assign`, data),
  panic: (data: object) => api.post("/incidents/panic", data),
};

export const noticeApi = {
  list: () => api.get("/notices"),
  create: (data: object) => api.post("/notices", data),
  get: (id: number) => api.get(`/notices/${id}`),
  ack: (id: number) => api.post(`/notices/${id}/ack`),
  reads: (id: number) => api.get(`/notices/${id}/reads`),
};

export const schedulingApi = {
  listRoutes: () => api.get("/scheduling/routes"),
  createRoute: (data: object) => api.post("/scheduling/routes", data),
  listDuties: (params?: object) => api.get("/scheduling/duties", { params }),
  createDuty: (data: object) => api.post("/scheduling/duties", data),
  publishDuty: (id: number) => api.patch(`/scheduling/duties/${id}/publish`),
  myDuties: () => api.get("/scheduling/duties/mine"),
  ackDuty: (id: number) => api.patch(`/scheduling/duties/${id}/ack`),
};
