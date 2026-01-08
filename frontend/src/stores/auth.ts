import { defineStore } from "pinia";
import { ref, computed } from "vue";
import apiClient from "@/api/client";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  error?: string;
}

interface UserResponse {
  success: boolean;
  data?: {
    user: User;
  };
  error?: string;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem("token"));
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  function setUser(userData: User | null) {
    user.value = userData;
  }

  function setToken(newToken: string | null) {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem("token", newToken);
    } else {
      localStorage.removeItem("token");
    }
  }

  function clearError() {
    error.value = null;
  }

  async function register(data: RegisterData): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<AuthResponse>(
        "/auth/register",
        data
      );
      if (response.data.success && response.data.data) {
        setToken(response.data.data.token);
        setUser(response.data.data.user);
        return true;
      }
      error.value = response.data.error || "Registration failed";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value = axiosError.response?.data?.error || "Registration failed";
      } else {
        error.value = "Registration failed";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function login(credentials: LoginCredentials): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<AuthResponse>(
        "/auth/login",
        credentials
      );
      if (response.data.success && response.data.data) {
        setToken(response.data.data.token);
        setUser(response.data.data.user);
        return true;
      }
      error.value = response.data.error || "Login failed";
      return false;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        error.value =
          axiosError.response?.data?.error || "Invalid email or password";
      } else {
        error.value = "Login failed";
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout(): Promise<void> {
    isLoading.value = true;
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore logout errors, still clear local state
    } finally {
      setUser(null);
      setToken(null);
      isLoading.value = false;
    }
  }

  async function fetchCurrentUser(): Promise<boolean> {
    if (!token.value) {
      return false;
    }
    isLoading.value = true;
    try {
      const response = await apiClient.get<UserResponse>("/auth/me");
      if (response.data.success && response.data.data) {
        setUser(response.data.data.user);
        return true;
      }
      return false;
    } catch {
      setToken(null);
      setUser(null);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    setUser,
    setToken,
    clearError,
    register,
    login,
    logout,
    fetchCurrentUser,
  };
});
