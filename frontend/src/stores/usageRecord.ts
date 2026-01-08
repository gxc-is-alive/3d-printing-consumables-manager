import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

export interface UsageRecord {
  id: string;
  userId: string;
  consumableId: string;
  amountUsed: number;
  usageDate: string;
  projectName: string | null;
  notes: string | null;
  createdAt: string;
  consumable?: {
    id: string;
    color: string;
    colorHex: string | null;
    remainingWeight: number;
    weight: number;
    brand?: {
      id: string;
      name: string;
    };
    type?: {
      id: string;
      name: string;
    };
  };
}

export interface UsageRecordFormData {
  consumableId: string;
  amountUsed: number;
  usageDate: string;
  projectName?: string;
  notes?: string;
}

export interface UsageRecordFilters {
  consumableId?: string;
  startDate?: string;
  endDate?: string;
}

interface UsageRecordResponse {
  success: boolean;
  data?: UsageRecord;
  warning?: string;
  error?: string;
}

interface UsageRecordsResponse {
  success: boolean;
  data?: UsageRecord[];
  error?: string;
}

export const useUsageRecordStore = defineStore("usageRecord", () => {
  const usageRecords = ref<UsageRecord[]>([]);
  const currentRecord = ref<UsageRecord | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const warning = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  function clearWarning() {
    warning.value = null;
  }

  async function fetchUsageRecords(
    filters?: UsageRecordFilters
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filters?.consumableId)
        params.append("consumableId", filters.consumableId);
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);

      const url = params.toString()
        ? `/usages?${params.toString()}`
        : "/usages";
      const response = await apiClient.get<UsageRecordsResponse>(url);
      if (response.data.success && response.data.data) {
        usageRecords.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "Failed to fetch usage records";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to fetch usage records";
      } else {
        error.value = "Failed to fetch usage records";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function createUsageRecord(
    data: UsageRecordFormData
  ): Promise<{ record: UsageRecord | null; warning: string | null }> {
    isLoading.value = true;
    error.value = null;
    warning.value = null;
    try {
      const response = await apiClient.post<UsageRecordResponse>(
        "/usages",
        data
      );
      if (response.data.success && response.data.data) {
        usageRecords.value.unshift(response.data.data);
        if (response.data.warning) {
          warning.value = response.data.warning;
        }
        return {
          record: response.data.data,
          warning: response.data.warning || null,
        };
      }
      error.value = response.data.error || "Failed to create usage record";
      return { record: null, warning: null };
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { data?: { error?: string; warning?: string } };
        };
        error.value =
          axiosError.response?.data?.error || "Failed to create usage record";
        if (axiosError.response?.data?.warning) {
          warning.value = axiosError.response.data.warning;
        }
      } else {
        error.value = "Failed to create usage record";
      }
      return { record: null, warning: null };
    } finally {
      isLoading.value = false;
    }
  }

  async function updateUsageRecord(
    id: string,
    data: Partial<UsageRecordFormData>
  ): Promise<{ record: UsageRecord | null; warning: string | null }> {
    isLoading.value = true;
    error.value = null;
    warning.value = null;
    try {
      const response = await apiClient.put<UsageRecordResponse>(
        `/usages/${id}`,
        data
      );
      if (response.data.success && response.data.data) {
        const index = usageRecords.value.findIndex((r) => r.id === id);
        if (index !== -1) {
          usageRecords.value[index] = response.data.data;
        }
        if (response.data.warning) {
          warning.value = response.data.warning;
        }
        return {
          record: response.data.data,
          warning: response.data.warning || null,
        };
      }
      error.value = response.data.error || "Failed to update usage record";
      return { record: null, warning: null };
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { data?: { error?: string; warning?: string } };
        };
        error.value =
          axiosError.response?.data?.error || "Failed to update usage record";
        if (axiosError.response?.data?.warning) {
          warning.value = axiosError.response.data.warning;
        }
      } else {
        error.value = "Failed to update usage record";
      }
      return { record: null, warning: null };
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteUsageRecord(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.delete<{
        success: boolean;
        error?: string;
      }>(`/usages/${id}`);
      if (response.data.success) {
        usageRecords.value = usageRecords.value.filter((r) => r.id !== id);
        return true;
      }
      error.value = response.data.error || "Failed to delete usage record";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to delete usage record";
      } else {
        error.value = "Failed to delete usage record";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    usageRecords,
    currentRecord,
    isLoading,
    error,
    warning,
    clearError,
    clearWarning,
    fetchUsageRecords,
    createUsageRecord,
    updateUsageRecord,
    deleteUsageRecord,
  };
});
