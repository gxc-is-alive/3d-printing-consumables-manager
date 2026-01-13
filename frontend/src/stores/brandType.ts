import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

export interface BrandType {
  id: string;
  userId: string;
  brandId: string;
  typeId: string;
  printTempMin: number | null;
  printTempMax: number | null;
  bedTempMin: number | null;
  bedTempMax: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  type?: {
    id: string;
    name: string;
    description: string | null;
  };
  brand?: {
    id: string;
    name: string;
  };
}

export interface BrandTypeConfig {
  typeId: string;
  printTempMin?: number | null;
  printTempMax?: number | null;
  bedTempMin?: number | null;
  bedTempMax?: number | null;
  notes?: string | null;
}

export const useBrandTypeStore = defineStore("brandType", () => {
  const brandTypes = ref<BrandType[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  function clearBrandTypes() {
    brandTypes.value = [];
  }

  async function fetchByBrand(brandId: string): Promise<BrandType[]> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/brand-types/brand/${brandId}`);
      brandTypes.value = response.data.data;
      return brandTypes.value;
    } catch (err: any) {
      error.value = err.response?.data?.error || "获取品牌类型配置失败";
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchByBrandAndType(
    brandId: string,
    typeId: string
  ): Promise<BrandType | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(
        `/brand-types/brand/${brandId}/type/${typeId}`
      );
      return response.data.data;
    } catch (err: any) {
      if (err.response?.status !== 404) {
        error.value = err.response?.data?.error || "获取品牌类型配置失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function saveBrandTypeConfigs(
    brandId: string,
    configs: BrandTypeConfig[]
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(
        `/brand-types/brand/${brandId}/batch`,
        { configs }
      );
      brandTypes.value = response.data.data;
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.error || "保存品牌类型配置失败";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteBrandType(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/brand-types/${id}`);
      brandTypes.value = brandTypes.value.filter((bt) => bt.id !== id);
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.error || "删除品牌类型配置失败";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    brandTypes,
    isLoading,
    error,
    clearError,
    clearBrandTypes,
    fetchByBrand,
    fetchByBrandAndType,
    saveBrandTypeConfigs,
    deleteBrandType,
  };
});
