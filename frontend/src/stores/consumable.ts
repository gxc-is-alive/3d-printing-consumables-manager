import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

// 耗材状态类型
export type ConsumableStatus = "unopened" | "opened" | "depleted";

// 状态显示名称
export const CONSUMABLE_STATUS = {
  unopened: "未开封",
  opened: "已开封",
  depleted: "已用完",
} as const;

export interface Consumable {
  id: string;
  userId: string;
  brandId: string;
  typeId: string;
  color: string;
  colorHex: string | null;
  weight: number;
  remainingWeight: number;
  price: number;
  purchaseDate: string;
  openedAt: string | null;
  isOpened: boolean;
  status: string; // 运行时为 ConsumableStatus
  depletedAt: string | null;
  openedDays: number | null; // Days since opened, null if not opened
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  brand?: {
    id: string;
    name: string;
  };
  type?: {
    id: string;
    name: string;
  };
}

export interface ConsumableFormData {
  brandId: string;
  typeId: string;
  color: string;
  colorHex?: string;
  weight: number;
  price: number;
  purchaseDate: string;
  notes?: string;
}

export interface ConsumableFilters {
  brandId?: string;
  typeId?: string;
  color?: string;
  colorHex?: string;
  isOpened?: boolean;
  status?: ConsumableStatus;
  includeDepleted?: boolean;
}

interface ConsumableResponse {
  success: boolean;
  data?: Consumable;
  error?: string;
}

interface ConsumablesResponse {
  success: boolean;
  data?: Consumable[];
  error?: string;
}

export interface BatchCreateFormData {
  brandId: string;
  typeId: string;
  color: string;
  colorHex?: string;
  weight: number;
  price: number;
  purchaseDate: string;
  notes?: string;
  quantity: number;
  isOpened?: boolean;
  openedAt?: string;
}

interface BatchCreateResponse {
  success: boolean;
  data?: { count: number; consumables: Consumable[] };
  error?: string;
}

export const useConsumableStore = defineStore("consumable", () => {
  const consumables = ref<Consumable[]>([]);
  const currentConsumable = ref<Consumable | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchConsumables(
    filters?: ConsumableFilters,
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filters?.brandId) params.append("brandId", filters.brandId);
      if (filters?.typeId) params.append("typeId", filters.typeId);
      if (filters?.color) params.append("color", filters.color);
      if (filters?.colorHex) params.append("colorHex", filters.colorHex);
      if (filters?.isOpened !== undefined)
        params.append("isOpened", String(filters.isOpened));
      if (filters?.status) params.append("status", filters.status);
      if (filters?.includeDepleted)
        params.append("includeDepleted", String(filters.includeDepleted));

      const url = params.toString()
        ? `/consumables?${params.toString()}`
        : "/consumables";
      const response = await apiClient.get<ConsumablesResponse>(url);
      if (response.data.success && response.data.data) {
        consumables.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "Failed to fetch consumables";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to fetch consumables";
      } else {
        error.value = "Failed to fetch consumables";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchConsumable(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<ConsumableResponse>(
        `/consumables/${id}`,
      );
      if (response.data.success && response.data.data) {
        currentConsumable.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "Failed to fetch consumable";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to fetch consumable";
      } else {
        error.value = "Failed to fetch consumable";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function createConsumable(
    data: ConsumableFormData,
  ): Promise<Consumable | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<ConsumableResponse>(
        "/consumables",
        data,
      );
      if (response.data.success && response.data.data) {
        consumables.value.unshift(response.data.data);
        return response.data.data;
      }
      error.value = response.data.error || "Failed to create consumable";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to create consumable";
      } else {
        error.value = "Failed to create consumable";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function batchCreateConsumable(
    data: BatchCreateFormData,
  ): Promise<{ count: number; consumables: Consumable[] } | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<BatchCreateResponse>(
        "/consumables/batch",
        data,
      );
      if (response.data.success && response.data.data) {
        // 将新创建的耗材添加到列表前面
        consumables.value.unshift(...response.data.data.consumables);
        return response.data.data;
      }
      error.value = response.data.error || "批量创建耗材失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "批量创建耗材失败";
      } else {
        error.value = "批量创建耗材失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateConsumable(
    id: string,
    data: Partial<ConsumableFormData>,
  ): Promise<Consumable | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<ConsumableResponse>(
        `/consumables/${id}`,
        data,
      );
      if (response.data.success && response.data.data) {
        const index = consumables.value.findIndex((c) => c.id === id);
        if (index !== -1) {
          consumables.value[index] = response.data.data;
        }
        return response.data.data;
      }
      error.value = response.data.error || "Failed to update consumable";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to update consumable";
      } else {
        error.value = "Failed to update consumable";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteConsumable(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.delete<{
        success: boolean;
        error?: string;
      }>(`/consumables/${id}`);
      if (response.data.success) {
        consumables.value = consumables.value.filter((c) => c.id !== id);
        return true;
      }
      error.value = response.data.error || "Failed to delete consumable";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to delete consumable";
      } else {
        error.value = "Failed to delete consumable";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function markAsOpened(
    id: string,
    openedAt?: string,
  ): Promise<Consumable | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.patch<ConsumableResponse>(
        `/consumables/${id}/open`,
        {
          openedAt,
        },
      );
      if (response.data.success && response.data.data) {
        const index = consumables.value.findIndex((c) => c.id === id);
        if (index !== -1) {
          consumables.value[index] = response.data.data;
        }
        return response.data.data;
      }
      error.value =
        response.data.error || "Failed to mark consumable as opened";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error ||
          "Failed to mark consumable as opened";
      } else {
        error.value = "Failed to mark consumable as opened";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function markAsDepleted(
    id: string,
    depletedAt?: string,
  ): Promise<Consumable | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.patch<ConsumableResponse>(
        `/consumables/${id}/deplete`,
        {
          depletedAt,
        },
      );
      if (response.data.success && response.data.data) {
        const index = consumables.value.findIndex((c) => c.id === id);
        if (index !== -1) {
          consumables.value[index] = response.data.data;
        }
        return response.data.data;
      }
      error.value = response.data.error || "标记耗材为已用完失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "标记耗材为已用完失败";
      } else {
        error.value = "标记耗材为已用完失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function restoreFromDepleted(id: string): Promise<Consumable | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.patch<ConsumableResponse>(
        `/consumables/${id}/restore`,
      );
      if (response.data.success && response.data.data) {
        const index = consumables.value.findIndex((c) => c.id === id);
        if (index !== -1) {
          consumables.value[index] = response.data.data;
        }
        return response.data.data;
      }
      error.value = response.data.error || "恢复耗材失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "恢复耗材失败";
      } else {
        error.value = "恢复耗材失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    consumables,
    currentConsumable,
    isLoading,
    error,
    clearError,
    fetchConsumables,
    fetchConsumable,
    createConsumable,
    batchCreateConsumable,
    updateConsumable,
    deleteConsumable,
    markAsOpened,
    markAsDepleted,
    restoreFromDepleted,
  };
});
