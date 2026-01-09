import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/api/client";

export interface BrandConfigFile {
  id: string;
  brandId: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

interface BrandConfigFilesResponse {
  success: boolean;
  data?: BrandConfigFile[];
  error?: string;
}

interface UploadResponse {
  success: boolean;
  data?: BrandConfigFile[];
  error?: string;
}

interface DeleteResponse {
  success: boolean;
  error?: string;
}

export const useBrandConfigFileStore = defineStore("brandConfigFile", () => {
  const files = ref<BrandConfigFile[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  function clearFiles() {
    files.value = [];
  }

  /**
   * 获取品牌下的所有配置文件
   */
  async function fetchFiles(brandId: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<BrandConfigFilesResponse>(
        `/brands/${brandId}/files`
      );
      if (response.data.success && response.data.data) {
        files.value = response.data.data;
        return true;
      }
      error.value = response.data.error || "获取文件列表失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "获取文件列表失败";
      } else {
        error.value = "获取文件列表失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 上传配置文件（支持多文件）
   */
  async function uploadFiles(
    brandId: string,
    fileList: File[]
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const formData = new FormData();
      for (const file of fileList) {
        formData.append("files", file);
      }

      const response = await apiClient.post<UploadResponse>(
        `/brands/${brandId}/files`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success && response.data.data) {
        // 将新上传的文件添加到列表开头
        files.value = [...response.data.data, ...files.value];
        return true;
      }
      error.value = response.data.error || "上传文件失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "上传文件失败";
      } else {
        error.value = "上传文件失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 下载配置文件
   */
  async function downloadFile(fileId: string, fileName: string): Promise<void> {
    try {
      const response = await apiClient.get(`/brand-files/${fileId}/download`, {
        responseType: "blob",
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "下载文件失败";
      } else {
        error.value = "下载文件失败";
      }
    }
  }

  /**
   * 删除配置文件
   */
  async function deleteFile(fileId: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.delete<DeleteResponse>(
        `/brand-files/${fileId}`
      );

      if (response.data.success) {
        files.value = files.value.filter((f) => f.id !== fileId);
        return true;
      }
      error.value = response.data.error || "删除文件失败";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "删除文件失败";
      } else {
        error.value = "删除文件失败";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    files,
    isLoading,
    error,
    clearError,
    clearFiles,
    fetchFiles,
    uploadFiles,
    downloadFile,
    deleteFile,
  };
});
