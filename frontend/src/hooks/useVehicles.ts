/**
 * hooks/useVehicles.ts — Live Vehicle Polling Hook
 * ==================================================
 * Uses SWR to poll the live vehicles endpoint every 5 seconds.
 * SWR handles: loading state, error state, cache, deduplication, and revalidation.
 *
 * WHY SWR instead of useEffect + setInterval?
 * - Automatic deduplication: if two components use this hook, only one request fires
 * - Automatic retry on network error
 * - Focuses tab: re-fetches when user switches back to the tab
 * - Much less code than manual polling
 */

import useSWR from "swr";
import { vehicleApi } from "@/lib/api";

export interface VehiclePosition {
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

const fetchLiveVehicles = async (depotId?: number) => {
  const response = await vehicleApi.getLive(depotId);
  return response.data as VehiclePosition[];
};

export function useLiveVehicles(depotId?: number) {
  const { data, error, isLoading } = useSWR(
    ["live-vehicles", depotId],          // Cache key — changes when depotId changes
    () => fetchLiveVehicles(depotId),
    {
      refreshInterval: 5000,             // Poll every 5 seconds
      revalidateOnFocus: true,           // Re-fetch when tab gets focus
      dedupingInterval: 4000,            // Don't fire if last request was < 4s ago
    }
  );

  return {
    vehicles: data ?? [],
    isLoading,
    isError: !!error,
    error,
  };
}

/**
 * useVehicleHistory — Fetch GPS ping history for a specific vehicle + date
 */
export function useVehicleHistory(vehicleId: number | null, date: string | null) {
  const { data, error, isLoading } = useSWR(
    vehicleId && date ? ["vehicle-history", vehicleId, date] : null,  // null disables fetch
    async () => {
      const response = await vehicleApi.getHistory(vehicleId!, date!);
      return response.data;
    }
  );

  return {
    pings: data ?? [],
    isLoading,
    isError: !!error,
  };
}
