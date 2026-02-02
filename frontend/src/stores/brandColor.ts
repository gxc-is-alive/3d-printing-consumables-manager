import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

export interface BrandColor {
  id: string;
  userId: string;
  brandId: string;
  colorName: string;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandColorData {
  colorName: string;
  colorHex?: string;
}

export interface UpdateBrandColorData {
  colorName?: string;
  colorHex?: string;
}

interface BrandColorResponse {
  success: boolean;
  data?: BrandColor;
  error?: string;
}

interface BrandColorsResponse {
  success: boolean;
  data?: BrandColor[];
  error?: string;
}

export const useBrandColorStore = defineStore("brandColor", () => {
  // 使用 Map 缓存不同品牌的颜色列表
  const colorsByBrand = ref<Map<string, BrandColor[]>>(new Map());
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  /**
   * 获取品牌颜色列表
   */
  async function fetchColors(brandId: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<BrandColorsResponse>(
        `/brands/${brandId}/colors`,
      );
      if (response.data.success && response.data.data) {
        colorsByBrand.value.set(brandId, response.data.data);
        return true;
      }
      error.value = response.data.error || "获取颜色列表失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "获取颜色列表失败";
      } else {
        error.value = "获取颜色列表失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 创建品牌颜色
   */
  async function createColor(
    brandId: string,
    data: CreateBrandColorData,
  ): Promise<BrandColor | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<BrandColorResponse>(
        `/brands/${brandId}/colors`,
        data,
      );
      if (response.data.success && response.data.data) {
        // 更新缓存
        const colors = colorsByBrand.value.get(brandId) || [];
        colors.push(response.data.data);
        // 按颜色名称排序
        colors.sort((a, b) => a.colorName.localeCompare(b.colorName));
        colorsByBrand.value.set(brandId, colors);
        return response.data.data;
      }
      error.value = response.data.error || "创建颜色失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "创建颜色失败";
      } else {
        error.value = "创建颜色失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 更新品牌颜色
   */
  async function updateColor(
    brandId: string,
    colorId: string,
    data: UpdateBrandColorData,
  ): Promise<BrandColor | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<BrandColorResponse>(
        `/brands/${brandId}/colors/${colorId}`,
        data,
      );
      if (response.data.success && response.data.data) {
        // 更新缓存
        const colors = colorsByBrand.value.get(brandId) || [];
        const index = colors.findIndex((c) => c.id === colorId);
        if (index !== -1) {
          colors[index] = response.data.data;
          // 重新排序
          colors.sort((a, b) => a.colorName.localeCompare(b.colorName));
          colorsByBrand.value.set(brandId, colors);
        }
        return response.data.data;
      }
      error.value = response.data.error || "更新颜色失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "更新颜色失败";
      } else {
        error.value = "更新颜色失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 删除品牌颜色
   */
  async function deleteColor(
    brandId: string,
    colorId: string,
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.delete<{
        success: boolean;
        error?: string;
      }>(`/brands/${brandId}/colors/${colorId}`);
      if (response.data.success) {
        // 更新缓存
        const colors = colorsByBrand.value.get(brandId) || [];
        colorsByBrand.value.set(
          brandId,
          colors.filter((c) => c.id !== colorId),
        );
        return true;
      }
      error.value = response.data.error || "删除颜色失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "删除颜色失败";
      } else {
        error.value = "删除颜色失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 获取缓存的颜色列表
   */
  function getColors(brandId: string): BrandColor[] {
    return colorsByBrand.value.get(brandId) || [];
  }

  /**
   * 检查颜色是否存在
   */
  function colorExists(brandId: string, colorName: string): boolean {
    const colors = colorsByBrand.value.get(brandId) || [];
    return colors.some(
      (c) => c.colorName.toLowerCase() === colorName.toLowerCase(),
    );
  }

  /**
   * 清除品牌颜色缓存
   */
  function clearBrandColors(brandId: string) {
    colorsByBrand.value.delete(brandId);
  }

  /**
   * 清除所有缓存
   */
  function clearAllColors() {
    colorsByBrand.value.clear();
  }

  return {
    colorsByBrand,
    isLoading,
    error,
    clearError,
    fetchColors,
    createColor,
    updateColor,
    deleteColor,
    getColors,
    colorExists,
    clearBrandColors,
    clearAllColors,
  };
});
