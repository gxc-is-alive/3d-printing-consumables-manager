import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

export interface ConsumableType {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumableTypeFormData {
  name: string;
  description?: string;
}

interface ConsumableTypeResponse {
  success: boolean;
  data?: ConsumableType;
  error?: string;
}

interface ConsumableTypesResponse {
  success: boolean;
  data?: ConsumableType[];
  error?: string;
}

export const useConsumableTypeStore = defineStore("consumableType", () => {
  const types = ref<ConsumableType[]>([]);
  const currentType = ref<ConsumableType | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchTypes(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<ConsumableTypesResponse>("/types");
      if (response.data.success && response.data.data) {
        types.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "Failed to fetch consumable types";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error ||
          "Failed to fetch consumable types";
      } else {
        error.value = "Failed to fetch consumable types";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchType(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<ConsumableTypeResponse>(
        `/types/${id}`
      );
      if (response.data.success && response.data.data) {
        currentType.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "Failed to fetch consumable type";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to fetch consumable type";
      } else {
        error.value = "Failed to fetch consumable type";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function createType(
    data: ConsumableTypeFormData
  ): Promise<ConsumableType | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<ConsumableTypeResponse>(
        "/types",
        data
      );
      if (response.data.success && response.data.data) {
        types.value.push(response.data.data);
        return response.data.data;
      }
      error.value = response.data.error || "Failed to create consumable type";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error ||
          "Failed to create consumable type";
      } else {
        error.value = "Failed to create consumable type";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateType(
    id: string,
    data: ConsumableTypeFormData
  ): Promise<ConsumableType | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<ConsumableTypeResponse>(
        `/types/${id}`,
        data
      );
      if (response.data.success && response.data.data) {
        const index = types.value.findIndex((t) => t.id === id);
        if (index !== -1) {
          types.value[index] = response.data.data;
        }
        return response.data.data;
      }
      error.value = response.data.error || "Failed to update consumable type";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error ||
          "Failed to update consumable type";
      } else {
        error.value = "Failed to update consumable type";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteType(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.delete<{
        success: boolean;
        error?: string;
      }>(`/types/${id}`);
      if (response.data.success) {
        types.value = types.value.filter((t) => t.id !== id);
        return true;
      }
      error.value = response.data.error || "Failed to delete consumable type";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error ||
          "Failed to delete consumable type";
      } else {
        error.value = "Failed to delete consumable type";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    types,
    currentType,
    isLoading,
    error,
    clearError,
    fetchTypes,
    fetchType,
    createType,
    updateType,
    deleteType,
  };
});
