import { ChildProcess, spawn, execSync, fork } from "child_process";
import * as path from "path";
import * as http from "http";
import * as fs from "fs";
import { app } from "electron";
import { resolveDatabasePath, isDev, getDatabaseFilePath } from "./utils";

export class BackendManager {
  private process: ChildProcess | null = null;
  private port: number;
  private maxRetries: number = 3;
  private retryCount: number = 0;

  constructor(port: number = 3000) {
    this.port = port;
  }

  async start(): Promise<void> {
    if (this.process) {
      console.log("Backend already running");
      return;
    }

    const backendPath = this.getBackendPath();
    const databaseUrl = resolveDatabasePath();
    const dbFilePath = getDatabaseFilePath();

    console.log(`Starting backend from: ${backendPath}`);
    console.log(`Database URL: ${databaseUrl}`);
    console.log(`Is Dev: ${isDev()}`);

    // 生产模式下初始化数据库
    if (!isDev()) {
      await this.initializeDatabase(dbFilePath, backendPath);
    }

    const env = {
      ...process.env,
      PORT: String(this.port),
      DATABASE_URL: databaseUrl,
      NODE_ENV: isDev() ? "development" : "production",
      JWT_SECRET: process.env.JWT_SECRET || "electron-app-secret-key",
    };

    if (isDev()) {
      // 开发模式：使用 ts-node 运行 TypeScript
      const entryFile = path.join(backendPath, "src", "index.ts");
      this.process = spawn("npx", ["ts-node", entryFile], {
        cwd: backendPath,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
      });
    } else {
      // 生产模式：使用 Node.js 直接运行编译后的 JS
      const entryFile = path.join(backendPath, "index.js");
      console.log(`Entry file: ${entryFile}`);
      console.log(`Entry file exists: ${fs.existsSync(entryFile)}`);

      // 使用 fork 而不是 spawn，更适合运行 Node.js 脚本
      this.process = fork(entryFile, [], {
        cwd: backendPath,
        env,
        stdio: ["pipe", "pipe", "pipe", "ipc"],
      });
    }

    this.process.stdout?.on("data", (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    this.process.stderr?.on("data", (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    this.process.on("error", (error) => {
      console.error("Failed to start backend:", error);
      this.process = null;
    });

    this.process.on("exit", (code, signal) => {
      console.log(`Backend exited with code ${code}, signal ${signal}`);
      this.process = null;
    });
  }

  private async initializeDatabase(
    dbFilePath: string,
    backendPath: string
  ): Promise<void> {
    const dbDir = path.dirname(dbFilePath);

    // 确保数据库目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`Created database directory: ${dbDir}`);
    }

    // 检查数据库文件是否存在
    const dbExists = fs.existsSync(dbFilePath);

    if (!dbExists) {
      console.log("Database not found, will be created on first connection...");
      // Prisma 会在首次连接时自动创建 SQLite 数据库文件
      // 不再依赖 npx prisma db push
    } else {
      console.log("Database already exists");
    }
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.on("exit", () => {
        this.process = null;
        resolve();
      });

      // 发送 SIGTERM 信号优雅关闭
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(this.process.pid), "/f", "/t"]);
      } else {
        this.process.kill("SIGTERM");
      }

      // 超时强制关闭
      setTimeout(() => {
        if (this.process) {
          this.process.kill("SIGKILL");
        }
        resolve();
      }, 5000);
    });
  }

  async waitForReady(timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 500;

    while (Date.now() - startTime < timeout) {
      if (await this.checkHealth()) {
        console.log("Backend is ready");
        return true;
      }
      await this.sleep(checkInterval);
    }

    console.error("Backend failed to start within timeout");
    return false;
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  getPort(): number {
    return this.port;
  }

  private async checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: this.port,
          path: "/api/health",
          method: "GET",
          timeout: 2000,
        },
        (res) => {
          resolve(res.statusCode === 200);
        }
      );

      req.on("error", () => {
        resolve(false);
      });

      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  private getBackendPath(): string {
    if (isDev()) {
      return path.join(__dirname, "..", "..", "backend");
    }
    return path.join(process.resourcesPath, "backend");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const backendManager = new BackendManager();
