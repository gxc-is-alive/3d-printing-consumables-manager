import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

export interface MaintenanceRecord {
  id: string;
  userId: string;
  date: string;
  type: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceFormData {
  date: string;
  type: string;
  description?: string;
}

interface MaintenanceResponse {
  success: boolean;
  data?: MaintenanceRecord;
  error?: string;
}

interface MaintenanceListResponse {
  success: boolean;
  data?: MaintenanceRecord[];
  error?: string;
}

// 保养类型映射
export const MAINTENANCE_TYPES = {
  cleaning: "清洁",
  lubrication: "润滑",
  replacement: "更换零件",
  calibration: "校准",
  other: "其他",
} as const;

export type MaintenanceType = keyof typeof MAINTENANCE_TYPES;

export const useMaintenanceStore = defineStore("maintenance", () => {
  const records = ref<MaintenanceRecord[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchRecords(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<MaintenanceListResponse>(
        "/maintenance"
      );
      if (response.data.success && response.data.data) {
        records.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "获取保养记录失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "获取保养记录失败";
      } else {
        error.value = "获取保养记录失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function createRecord(
    data: MaintenanceFormData
  ): Promise<MaintenanceRecord | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<MaintenanceResponse>(
        "/maintenance",
        data
      );
      if (response.data.success && response.data.data) {
        records.value.unshift(response.data.data);
        return response.data.data;
      }
      error.value = response.data.error || "创建保养记录失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "创建保养记录失败";
      } else {
        error.value = "创建保养记录失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateRecord(
    id: string,
    data: MaintenanceFormData
  ): Promise<MaintenanceRecord | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<MaintenanceResponse>(
        `/maintenance/${id}`,
        data
      );
      if (response.data.success && response.data.data) {
        const index = records.value.findIndex((r) => r.id === id);
        if (index !== -1) {
          records.value[index] = response.data.data;
        }
        return response.data.data;
      }
      error.value = response.data.error || "更新保养记录失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "更新保养记录失败";
      } else {
        error.value = "更新保养记录失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteRecord(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.delete<{
        success: boolean;
        error?: string;
      }>(`/maintenance/${id}`);
      if (response.data.success) {
        records.value = records.value.filter((r) => r.id !== id);
        return true;
      }
      error.value = response.data.error || "删除保养记录失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "删除保养记录失败";
      } else {
        error.value = "删除保养记录失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    records,
    isLoading,
    error,
    clearError,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
  };
});
