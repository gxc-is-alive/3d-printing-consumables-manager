import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

export interface InventoryGroupByBrand {
  brandId: string;
  brandName: string;
  totalWeight: number;
  totalRemainingWeight: number;
  count: number;
}

export interface InventoryGroupByType {
  typeId: string;
  typeName: string;
  totalWeight: number;
  totalRemainingWeight: number;
  count: number;
}

export interface InventoryGroupByColor {
  color: string;
  colorHex: string | null;
  totalWeight: number;
  totalRemainingWeight: number;
  count: number;
}

export interface LowStockItem {
  id: string;
  color: string;
  brandName: string;
  typeName: string;
  remainingWeight: number;
  weight: number;
  percentRemaining: number;
}

export interface InventoryOverview {
  byBrand: InventoryGroupByBrand[];
  byType: InventoryGroupByType[];
  byColor: InventoryGroupByColor[];
}

export interface InventoryStats {
  totalConsumables: number;
  totalWeight: number;
  totalRemainingWeight: number;
  totalSpending: number;
  openedCount: number;
  unopenedCount: number;
  lowStockItems: LowStockItem[];
}

export interface PriceTrendItem {
  date: string;
  price: number;
  brandName: string;
  typeName: string;
  color: string;
}

export interface PriceStats {
  trend: PriceTrendItem[];
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  totalCount: number;
}

interface InventoryResponse {
  success: boolean;
  data?: InventoryOverview;
  error?: string;
}

interface StatsResponse {
  success: boolean;
  data?: InventoryStats;
  error?: string;
}

interface PriceStatsResponse {
  success: boolean;
  data?: PriceStats;
  error?: string;
}

export const useDashboardStore = defineStore("dashboard", () => {
  const inventory = ref<InventoryOverview | null>(null);
  const stats = ref<InventoryStats | null>(null);
  const priceStats = ref<PriceStats | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchInventory(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<InventoryResponse>(
        "/dashboard/inventory",
      );
      if (response.data.success && response.data.data) {
        inventory.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "Failed to fetch inventory";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to fetch inventory";
      } else {
        error.value = "Failed to fetch inventory";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchStats(threshold?: number): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const url =
        threshold !== undefined
          ? `/dashboard/stats?threshold=${threshold}`
          : "/dashboard/stats";
      const response = await apiClient.get<StatsResponse>(url);
      if (response.data.success && response.data.data) {
        stats.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "Failed to fetch stats";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to fetch stats";
      } else {
        error.value = "Failed to fetch stats";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAll(threshold?: number): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const [inventorySuccess, statsSuccess] = await Promise.all([
        fetchInventory(),
        fetchStats(threshold),
      ]);
      return inventorySuccess && statsSuccess;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchPriceStats(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<PriceStatsResponse>(
        "/dashboard/price-stats",
      );
      if (response.data.success && response.data.data) {
        priceStats.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "Failed to fetch price stats";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to fetch price stats";
      } else {
        error.value = "Failed to fetch price stats";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    inventory,
    stats,
    priceStats,
    isLoading,
    error,
    clearError,
    fetchInventory,
    fetchStats,
    fetchAll,
    fetchPriceStats,
  };
});
