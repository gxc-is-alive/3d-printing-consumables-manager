import * as path from "path";
import { app } from "electron";
import * as fs from "fs";

/**
 * 检查是否为开发模式
 */
export function isDev(): boolean {
  // 检查是否通过 electron . 启动（开发模式）
  return !app.isPackaged;
}

/**
 * 解析数据库路径
 * 开发模式：使用项目目录下的 backend/prisma/dev.db
 * 生产模式：使用用户数据目录下的 data.db
 */
export function resolveDatabasePath(): string {
  if (isDev()) {
    const devDbPath = path.join(
      __dirname,
      "..",
      "..",
      "backend",
      "prisma",
      "dev.db"
    );
    return `file:${devDbPath}`;
  }

  const userDataPath = app.getPath("userData");
  const dbDir = path.join(userDataPath, "data");

  // 确保目录存在
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "data.db");
  return `file:${dbPath}`;
}

/**
 * 获取数据库文件的绝对路径（不带 file: 前缀）
 */
export function getDatabaseFilePath(): string {
  const dbUrl = resolveDatabasePath();
  return dbUrl.replace("file:", "");
}

/**
 * 获取前端资源路径
 */
export function getFrontendPath(): string {
  if (isDev()) {
    return "http://localhost:5173";
  }
  return path.join(process.resourcesPath, "frontend", "index.html");
}

/**
 * 获取后端 URL
 */
export function getBackendUrl(port: number = 3000): string {
  return `http://localhost:${port}`;
}
