import { defineStore } from "pinia";
import { ref, computed } from "vue";
import apiClient from "@/api/client";

// ============ 类型定义 ============

export interface ConsumableType {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TypeSubtype {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  parentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TypeCategory {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  parentId: null;
  children: TypeSubtype[];
  createdAt: string;
  updatedAt: string;
}

export interface TypeHierarchy {
  categories: TypeCategory[];
}

export interface ConsumableTypeFormData {
  name: string;
  description?: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
}

export interface CreateSubtypeData {
  name: string;
  description?: string;
  parentId: string;
}

export interface MigrationPreview {
  types: Array<{
    id: string;
    originalName: string;
    categoryName: string;
    subtypeName: string;
    hasConsumables: boolean;
    hasBrandTypes: boolean;
  }>;
  categoriesWillCreate: string[];
  totalTypes: number;
}

export interface MigrationResult {
  success: boolean;
  categoriesCreated: number;
  subtypesUpdated: number;
  recordsMigrated: number;
  errors: string[];
}

// ============ API 响应类型 ============

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============ Store 定义 ============

export const useConsumableTypeStore = defineStore("consumableType", () => {
  // ============ 状态 ============
  const types = ref<ConsumableType[]>([]);
  const hierarchy = ref<TypeHierarchy>({ categories: [] });
  const currentType = ref<ConsumableType | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const needsMigration = ref(false);

  // ============ 计算属性 ============

  // 获取所有大类
  const categories = computed(() => hierarchy.value.categories);

  // 获取扁平化的小类列表（用于选择器）
  const subtypes = computed(() => {
    const result: TypeSubtype[] = [];
    for (const cat of hierarchy.value.categories) {
      result.push(...cat.children);
    }
    return result;
  });

  // 获取级联选择器选项
  const cascadeOptions = computed(() => {
    return hierarchy.value.categories.map((cat) => ({
      value: cat.id,
      label: cat.name,
      children: cat.children.map((sub) => ({
        value: sub.id,
        label: sub.name,
      })),
    }));
  });

  // ============ 辅助方法 ============

  function clearError() {
    error.value = null;
  }

  function getTypeDisplayName(typeId: string): string {
    for (const cat of hierarchy.value.categories) {
      if (cat.id === typeId) {
        return cat.name;
      }
      for (const sub of cat.children) {
        if (sub.id === typeId) {
          return `${cat.name} ${sub.name}`;
        }
      }
    }
    // 回退到 types 列表
    const type = types.value.find((t) => t.id === typeId);
    return type?.name || "";
  }

  function findCategoryBySubtypeId(subtypeId: string): TypeCategory | null {
    for (const cat of hierarchy.value.categories) {
      if (cat.children.some((sub) => sub.id === subtypeId)) {
        return cat;
      }
    }
    return null;
  }

  // ============ 层级 API ============

  async function fetchHierarchy(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response =
        await apiClient.get<ApiResponse<TypeHierarchy>>("/types/hierarchy");
      if (response.data.success && response.data.data) {
        hierarchy.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "获取类型层级失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "获取类型层级失败";
      } else {
        error.value = "获取类型层级失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function createCategory(
    data: CreateCategoryData,
  ): Promise<TypeCategory | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<ApiResponse<TypeCategory>>(
        "/types/categories",
        data,
      );
      if (response.data.success && response.data.data) {
        hierarchy.value.categories.push(response.data.data);
        return response.data.data;
      }
      error.value = response.data.error || "创建大类失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "创建大类失败";
      } else {
        error.value = "创建大类失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateCategory(
    id: string,
    data: CreateCategoryData,
  ): Promise<TypeCategory | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<ApiResponse<TypeCategory>>(
        `/types/categories/${id}`,
        data,
      );
      if (response.data.success && response.data.data) {
        const index = hierarchy.value.categories.findIndex((c) => c.id === id);
        if (index !== -1) {
          hierarchy.value.categories[index] = response.data.data;
        }
        return response.data.data;
      }
      error.value = response.data.error || "更新大类失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "更新大类失败";
      } else {
        error.value = "更新大类失败";
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
      const response = await apiClient.delete<ApiResponse<void>>(
        `/types/categories/${id}`,
      );
      if (response.data.success) {
        hierarchy.value.categories = hierarchy.value.categories.filter(
          (c) => c.id !== id,
        );
        return true;
      }
      error.value = response.data.error || "删除大类失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "删除大类失败";
      } else {
        error.value = "删除大类失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function createSubtype(
    data: CreateSubtypeData,
  ): Promise<TypeSubtype | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<ApiResponse<TypeSubtype>>(
        "/types/subtypes",
        data,
      );
      if (response.data.success && response.data.data) {
        const category = hierarchy.value.categories.find(
          (c) => c.id === data.parentId,
        );
        if (category) {
          category.children.push(response.data.data);
        }
        return response.data.data;
      }
      error.value = response.data.error || "创建小类失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "创建小类失败";
      } else {
        error.value = "创建小类失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateSubtype(
    id: string,
    data: { name?: string; description?: string },
  ): Promise<TypeSubtype | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<ApiResponse<TypeSubtype>>(
        `/types/subtypes/${id}`,
        data,
      );
      if (response.data.success && response.data.data) {
        // 更新层级中的小类
        for (const cat of hierarchy.value.categories) {
          const index = cat.children.findIndex((s) => s.id === id);
          if (index !== -1) {
            cat.children[index] = response.data.data;
            break;
          }
        }
        return response.data.data;
      }
      error.value = response.data.error || "更新小类失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "更新小类失败";
      } else {
        error.value = "更新小类失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function moveSubtype(
    id: string,
    newParentId: string,
  ): Promise<TypeSubtype | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<ApiResponse<TypeSubtype>>(
        `/types/subtypes/${id}/move`,
        { parentId: newParentId },
      );
      if (response.data.success && response.data.data) {
        // 从旧大类中移除
        for (const cat of hierarchy.value.categories) {
          const index = cat.children.findIndex((s) => s.id === id);
          if (index !== -1) {
            cat.children.splice(index, 1);
            break;
          }
        }
        // 添加到新大类
        const newCategory = hierarchy.value.categories.find(
          (c) => c.id === newParentId,
        );
        if (newCategory) {
          newCategory.children.push(response.data.data);
        }
        return response.data.data;
      }
      error.value = response.data.error || "移动小类失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "移动小类失败";
      } else {
        error.value = "移动小类失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteSubtype(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/types/subtypes/${id}`,
      );
      if (response.data.success) {
        // 从层级中移除
        for (const cat of hierarchy.value.categories) {
          const index = cat.children.findIndex((s) => s.id === id);
          if (index !== -1) {
            cat.children.splice(index, 1);
            break;
          }
        }
        return true;
      }
      error.value = response.data.error || "删除小类失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "删除小类失败";
      } else {
        error.value = "删除小类失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // ============ 迁移 API ============

  async function checkMigrationStatus(): Promise<boolean> {
    try {
      const response = await apiClient.get<
        ApiResponse<{ needsMigration: boolean }>
      >("/types/migrate/status");
      if (response.data.success && response.data.data) {
        needsMigration.value = response.data.data.needsMigration;
        return response.data.data.needsMigration;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function previewMigration(): Promise<MigrationPreview | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<ApiResponse<MigrationPreview>>(
        "/types/migrate/preview",
      );
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      error.value = response.data.error || "预览迁移失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "预览迁移失败";
      } else {
        error.value = "预览迁移失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function executeMigration(): Promise<MigrationResult | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response =
        await apiClient.post<ApiResponse<MigrationResult>>("/types/migrate");
      if (response.data.success && response.data.data) {
        needsMigration.value = false;
        // 刷新层级数据
        await fetchHierarchy();
        return response.data.data;
      }
      error.value = response.data.error || "执行迁移失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "执行迁移失败";
      } else {
        error.value = "执行迁移失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // ============ 兼容旧 API ============

  async function fetchTypes(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response =
        await apiClient.get<ApiResponse<ConsumableType[]>>("/types");
      if (response.data.success && response.data.data) {
        types.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "获取类型列表失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "获取类型列表失败";
      } else {
        error.value = "获取类型列表失败";
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
      const response = await apiClient.get<ApiResponse<ConsumableType>>(
        `/types/${id}`,
      );
      if (response.data.success && response.data.data) {
        currentType.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "获取类型详情失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "获取类型详情失败";
      } else {
        error.value = "获取类型详情失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function createType(
    data: ConsumableTypeFormData,
  ): Promise<ConsumableType | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<ApiResponse<ConsumableType>>(
        "/types",
        data,
      );
      if (response.data.success && response.data.data) {
        types.value.push(response.data.data);
        return response.data.data;
      }
      error.value = response.data.error || "创建类型失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "创建类型失败";
      } else {
        error.value = "创建类型失败";
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateType(
    id: string,
    data: ConsumableTypeFormData,
  ): Promise<ConsumableType | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put<ApiResponse<ConsumableType>>(
        `/types/${id}`,
        data,
      );
      if (response.data.success && response.data.data) {
        const index = types.value.findIndex((t) => t.id === id);
        if (index !== -1) {
          types.value[index] = response.data.data;
        }
        return response.data.data;
      }
      error.value = response.data.error || "更新类型失败";
      return null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "更新类型失败";
      } else {
        error.value = "更新类型失败";
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
      const response = await apiClient.delete<ApiResponse<void>>(
        `/types/${id}`,
      );
      if (response.data.success) {
        types.value = types.value.filter((t) => t.id !== id);
        return true;
      }
      error.value = response.data.error || "删除类型失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "删除类型失败";
      } else {
        error.value = "删除类型失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // 状态
    types,
    hierarchy,
    categories,
    subtypes,
    cascadeOptions,
    currentType,
    isLoading,
    error,
    needsMigration,
    // 辅助方法
    clearError,
    getTypeDisplayName,
    findCategoryBySubtypeId,
    // 层级 API
    fetchHierarchy,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubtype,
    updateSubtype,
    moveSubtype,
    deleteSubtype,
    // 迁移 API
    checkMigrationStatus,
    previewMigration,
    executeMigration,
    // 兼容旧 API
    fetchTypes,
    fetchType,
    createType,
    updateType,
    deleteType,
  };
});
