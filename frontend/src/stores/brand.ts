import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

export interface Brand {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandFormData {
  name: string;
  description?: string;
  website?: string;
}

interface BrandResponse {
  success: boolean;
  data?: Brand;
  error?: string;
}

interface BrandsResponse {
  success: boolean;
  data?: Brand[];
  error?: string;
}

export const useBrandStore = defineStore("brand", () => {
  const brands = ref<Brand[]>([]);
  const currentBrand = ref<Brand | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchBrands(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<BrandsResponse>("/brands");
      if (response.data.success && response.data.data) {
        brands.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "Failed to fetch brands";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to fetch brands";
      } else {
        error.value = "Failed to fetch brands";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchBrand(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<BrandResponse>(`/brands/${id}`);
      if (response.data.success && response.data.data) {
        currentBrand.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "Failed to fetch brand";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to fetch brand";
      } else {
        error.value = "Failed to fetch brand";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function createBrand(data: BrandFormData): Promise<Brand | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<BrandResponse>("/brands", data);
      if (response.data.success && response.data.data) {
        brands.value.push(response.data.data);
        return response.data.data;
      }
      error.value = response.data.error || "Failed to create brand";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to create brand";
      } else {
        error.value = "Failed to create brand";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateBrand(
    id: string,
    data: BrandFormData
  ): Promise<Brand | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<BrandResponse>(
        `/brands/${id}`,
        data
      );
      if (response.data.success && response.data.data) {
        const index = brands.value.findIndex((b) => b.id === id);
        if (index !== -1) {
          brands.value[index] = response.data.data;
        }
        return response.data.data;
      }
      error.value = response.data.error || "Failed to update brand";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to update brand";
      } else {
        error.value = "Failed to update brand";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteBrand(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.delete<{
        success: boolean;
        error?: string;
      }>(`/brands/${id}`);
      if (response.data.success) {
        brands.value = brands.value.filter((b) => b.id !== id);
        return true;
      }
      error.value = response.data.error || "Failed to delete brand";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Failed to delete brand";
      } else {
        error.value = "Failed to delete brand";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    brands,
    currentBrand,
    isLoading,
    error,
    clearError,
    fetchBrands,
    fetchBrand,
    createBrand,
    updateBrand,
    deleteBrand,
  };
});
