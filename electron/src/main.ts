import { app, BrowserWindow, dialog, ipcMain } from "electron";
import * as path from "path";
import { backendManager } from "./backend-manager";
import { isDev, getFrontendPath } from "./utils";

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

async function createSplashWindow(): Promise<BrowserWindow> {
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: white;
          border-radius: 10px;
        }
        .container {
          text-align: center;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 20px;
        }
        .loader {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        p {
          margin-top: 20px;
          font-size: 14px;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>3D打印耗材管理</h1>
        <div class="loader"></div>
        <p>正在启动服务...</p>
      </div>
    </body>
    </html>
  `;

  splash.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`
  );
  return splash;
}

async function createMainWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // 开发模式下打开开发者工具
  if (isDev()) {
    win.webContents.openDevTools();
  }

  // 注册快捷键打开开发者工具
  win.webContents.on("before-input-event", (event, input) => {
    if (
      input.key === "F12" ||
      (input.control && input.shift && input.key === "I")
    ) {
      win.webContents.toggleDevTools();
    }
  });

  return win;
}

async function loadFrontend(win: BrowserWindow): Promise<void> {
  const frontendPath = getFrontendPath();

  if (isDev()) {
    // 开发模式：连接到 Vite 开发服务器
    await win.loadURL(frontendPath);
  } else {
    // 生产模式：加载本地文件
    await win.loadFile(frontendPath);
  }
}

async function startApp(): Promise<void> {
  // 显示启动画面
  splashWindow = await createSplashWindow();

  try {
    // 启动后端服务
    await backendManager.start();

    // 等待后端就绪
    const isReady = await backendManager.waitForReady(30000);

    if (!isReady) {
      throw new Error("后端服务启动超时");
    }

    // 创建主窗口
    mainWindow = await createMainWindow();

    // 加载前端
    await loadFrontend(mainWindow);

    // 关闭启动画面，显示主窗口
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }

    mainWindow.show();
    mainWindow.focus();
  } catch (error) {
    console.error("启动失败:", error);

    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }

    await showErrorDialog(error instanceof Error ? error.message : "未知错误");
  }
}

async function showErrorDialog(message: string): Promise<void> {
  const result = await dialog.showMessageBox({
    type: "error",
    title: "启动失败",
    message: "应用启动失败",
    detail: message,
    buttons: ["重试", "退出"],
    defaultId: 0,
    cancelId: 1,
  });

  if (result.response === 0) {
    // 重试
    await startApp();
  } else {
    // 退出
    app.quit();
  }
}

// 应用就绪
app.whenReady().then(startApp);

// 所有窗口关闭时
app.on("window-all-closed", async () => {
  await backendManager.stop();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// macOS 激活应用
app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await startApp();
  }
});

// 应用退出前
app.on("before-quit", async () => {
  await backendManager.stop();
});
