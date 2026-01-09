import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

export interface AccessoryUsage {
  id: string;
  userId: string;
  accessoryId: string;
  usageDate: string;
  quantity: number;
  purpose: string | null;
  createdAt: string;
}

export interface Accessory {
  id: string;
  userId: string;
  categoryId: string;
  name: string;
  brand: string | null;
  model: string | null;
  price: number | null;
  purchaseDate: string | null;
  quantity: number;
  remainingQty: number;
  replacementCycle: number | null;
  lastReplacedAt: string | null;
  lowStockThreshold: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string };
  usageRecords?: AccessoryUsage[];
}

export interface AccessoryFormData {
  categoryId: string;
  name: string;
  brand?: string;
  model?: string;
  price?: number;
  purchaseDate?: string;
  quantity?: number;
  replacementCycle?: number;
  lowStockThreshold?: number;
  notes?: string;
}

export interface AccessoryAlert {
  id: string;
  name: string;
  type: "replacement_due" | "low_stock";
  message: string;
  categoryName: string;
  daysOverdue?: number;
  remainingQty?: number;
  threshold?: number;
}

interface AccessoryResponse {
  success: boolean;
  data?: Accessory;
  error?: string;
}

interface AccessoryListResponse {
  success: boolean;
  data?: Accessory[];
  error?: string;
}

interface AlertsResponse {
  success: boolean;
  data?: AccessoryAlert[];
  error?: string;
}

// 配件状态映射
export const ACCESSORY_STATUS = {
  available: "可用",
  low_stock: "库存不足",
  depleted: "已用完",
} as const;

export type AccessoryStatus = keyof typeof ACCESSORY_STATUS;

export const useAccessoryStore = defineStore("accessory", () => {
  const accessories = ref<Accessory[]>([]);
  const alerts = ref<AccessoryAlert[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchAccessories(filters?: {
    categoryId?: string;
    status?: string;
  }): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filters?.categoryId) params.append("categoryId", filters.categoryId);
      if (filters?.status) params.append("status", filters.status);
      const url = params.toString() ? `/accessories?${params}` : "/accessories";

      const response = await apiClient.get<AccessoryListResponse>(url);
      if (response.data.success && response.data.data) {
        accessories.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "获取配件列表失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "获取配件列表失败";
      } else {
        error.value = "获取配件列表失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function createAccessory(
    data: AccessoryFormData
  ): Promise<Accessory | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<AccessoryResponse>(
        "/accessories",
        data
      );
      if (response.data.success && response.data.data) {
        accessories.value.unshift(response.data.data);
        return response.data.data;
      }
      error.value = response.data.error || "创建配件失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "创建配件失败";
      } else {
        error.value = "创建配件失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateAccessory(
    id: string,
    data: Partial<AccessoryFormData>
  ): Promise<Accessory | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<AccessoryResponse>(
        `/accessories/${id}`,
        data
      );
      if (response.data.success && response.data.data) {
        const index = accessories.value.findIndex((a) => a.id === id);
        if (index !== -1) {
          accessories.value[index] = response.data.data;
        }
        return response.data.data;
      }
      error.value = response.data.error || "更新配件失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "更新配件失败";
      } else {
        error.value = "更新配件失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteAccessory(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.delete<{
        success: boolean;
        error?: string;
      }>(`/accessories/${id}`);
      if (response.data.success) {
        accessories.value = accessories.value.filter((a) => a.id !== id);
        return true;
      }
      error.value = response.data.error || "删除配件失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "删除配件失败";
      } else {
        error.value = "删除配件失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function recordUsage(
    id: string,
    data: { usageDate: string; quantity: number; purpose?: string }
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<AccessoryResponse>(
        `/accessories/${id}/usage`,
        data
      );
      if (response.data.success && response.data.data) {
        const index = accessories.value.findIndex((a) => a.id === id);
        if (index !== -1) {
          accessories.value[index] = response.data.data;
        }
        return true;
      }
      error.value = response.data.error || "记录使用失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "记录使用失败";
      } else {
        error.value = "记录使用失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAlerts(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<AlertsResponse>(
        "/accessories/alerts"
      );
      if (response.data.success && response.data.data) {
        alerts.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "获取配件提醒失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "获取配件提醒失败";
      } else {
        error.value = "获取配件提醒失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    accessories,
    alerts,
    isLoading,
    error,
    clearError,
    fetchAccessories,
    createAccessory,
    updateAccessory,
    deleteAccessory,
    recordUsage,
    fetchAlerts,
  };
});
