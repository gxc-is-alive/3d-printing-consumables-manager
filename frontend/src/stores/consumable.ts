import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

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

export const useConsumableStore = defineStore("consumable", () => {
  const consumables = ref<Consumable[]>([]);
  const currentConsumable = ref<Consumable | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchConsumables(
    filters?: ConsumableFilters
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
        `/consumables/${id}`
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
    data: ConsumableFormData
  ): Promise<Consumable | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<ConsumableResponse>(
        "/consumables",
        data
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

  async function updateConsumable(
    id: string,
    data: Partial<ConsumableFormData>
  ): Promise<Consumable | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<ConsumableResponse>(
        `/consumables/${id}`,
        data
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
    openedAt?: string
  ): Promise<Consumable | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.patch<ConsumableResponse>(
        `/consumables/${id}/open`,
        {
          openedAt,
        }
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

  return {
    consumables,
    currentConsumable,
    isLoading,
    error,
    clearError,
    fetchConsumables,
    fetchConsumable,
    createConsumable,
    updateConsumable,
    deleteConsumable,
    markAsOpened,
  };
});
