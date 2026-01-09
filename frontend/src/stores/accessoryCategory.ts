import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

export interface AccessoryCategory {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoryResponse {
  success: boolean;
  data?: AccessoryCategory;
  error?: string;
}

interface CategoryListResponse {
  success: boolean;
  data?: AccessoryCategory[];
  error?: string;
}

export const useAccessoryCategoryStore = defineStore(
  "accessoryCategory",
  () => {
    const categories = ref<AccessoryCategory[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    function clearError() {
      error.value = null;
    }

    async function fetchCategories(): Promise<boolean> {
      isLoading.value = true;
      error.value = null;
      try {
        const response = await apiClient.get<CategoryListResponse>(
          "/accessory-categories"
        );
        if (response.data.success && response.data.data) {
          categories.value = response.data.data;
          return true;
        }
        error.value = response.data.error || "获取配件分类失败";
        return false;
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axiosError = err as {
            response?: { data?: { error?: string } };
          };
          error.value = axiosError.response?.data?.error || "获取配件分类失败";
        } else {
          error.value = "获取配件分类失败";
        }
        return false;
      } finally {
        isLoading.value = false;
      }
    }

    async function createCategory(data: {
      name: string;
      description?: string;
    }): Promise<AccessoryCategory | null> {
      isLoading.value = true;
      error.value = null;
      try {
        const response = await apiClient.post<CategoryResponse>(
          "/accessory-categories",
          data
        );
        if (response.data.success && response.data.data) {
          categories.value.push(response.data.data);
          return response.data.data;
        }
        error.value = response.data.error || "创建配件分类失败";
        return null;
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axiosError = err as {
            response?: { data?: { error?: string } };
          };
          error.value = axiosError.response?.data?.error || "创建配件分类失败";
        } else {
          error.value = "创建配件分类失败";
        }
        return null;
      } finally {
        isLoading.value = false;
      }
    }

    async function deleteCategory(id: string): Promise<boolean> {
      isLoading.value = true;
      error.value = null;
      try {
        const response = await apiClient.delete<{
          success: boolean;
          error?: string;
        }>(`/accessory-categories/${id}`);
        if (response.data.success) {
          categories.value = categories.value.filter((c) => c.id !== id);
          return true;
        }
        error.value = response.data.error || "删除配件分类失败";
        return false;
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axiosError = err as {
            response?: { data?: { error?: string } };
          };
          error.value = axiosError.response?.data?.error || "删除配件分类失败";
        } else {
          error.value = "删除配件分类失败";
        }
        return false;
      } finally {
        isLoading.value = false;
      }
    }

    return {
      categories,
      isLoading,
      error,
      clearError,
      fetchCategories,
      createCategory,
      deleteCategory,
    };
  }
);
