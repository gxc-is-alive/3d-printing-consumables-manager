import axios from "axios";

// 检测是否在 Electron 环境中运行
const isElectron = window.location.protocol === "file:";

// 根据环境设置 API 基础 URL
const getBaseURL = (): string => {
  if (isElectron) {
    // Electron 生产环境：后端运行在 localhost:3000
    return "http://localhost:3000/api";
  }
  // 开发环境或 Web 环境：使用相对路径（由 Vite 代理）
  return "/api";
};

const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // 在 Electron 中使用 hash 路由
      if (isElectron) {
        window.location.hash = "#/login";
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
