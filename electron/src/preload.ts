import { contextBridge } from "electron";

// 暴露给渲染进程的 API
const electronAPI = {
  getAppVersion: (): string => {
    return process.env.npm_package_version || "1.0.0";
  },
  getPlatform: (): string => {
    return process.platform;
  },
  getNodeVersion: (): string => {
    return process.versions.node;
  },
  getElectronVersion: (): string => {
    return process.versions.electron;
  },
};

// 将 API 暴露到 window.electronAPI
contextBridge.exposeInMainWorld("electronAPI", electronAPI);

// TypeScript 类型声明
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
