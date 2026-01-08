/**
 * 开发模式启动脚本
 * 协调启动前端、后端和 Electron
 */

const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const rootDir = path.join(__dirname, "..", "..");
const frontendDir = path.join(rootDir, "frontend");
const backendDir = path.join(rootDir, "backend");
const electronDir = path.join(rootDir, "electron");

let frontendProcess = null;
let backendProcess = null;
let electronProcess = null;

function log(prefix, message) {
  console.log(`[${prefix}] ${message}`);
}

function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            retry();
          }
        })
        .on("error", retry);
    };

    const retry = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Server at ${url} did not start within ${timeout}ms`));
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

async function startFrontend() {
  log("Frontend", "Starting Vite dev server...");

  frontendProcess = spawn("npm", ["run", "dev"], {
    cwd: frontendDir,
    stdio: "pipe",
    shell: true,
  });

  frontendProcess.stdout.on("data", (data) => {
    log("Frontend", data.toString().trim());
  });

  frontendProcess.stderr.on("data", (data) => {
    log("Frontend Error", data.toString().trim());
  });

  // 等待 Vite 服务器就绪
  await waitForServer("http://localhost:5173");
  log("Frontend", "Vite dev server is ready");
}

async function startBackend() {
  log("Backend", "Starting Express server...");

  backendProcess = spawn("npm", ["run", "dev"], {
    cwd: backendDir,
    stdio: "pipe",
    shell: true,
  });

  backendProcess.stdout.on("data", (data) => {
    log("Backend", data.toString().trim());
  });

  backendProcess.stderr.on("data", (data) => {
    log("Backend Error", data.toString().trim());
  });

  // 等待后端服务器就绪
  await waitForServer("http://localhost:3000/api/health");
  log("Backend", "Express server is ready");
}

async function startElectron() {
  log("Electron", "Compiling TypeScript...");

  // 先编译 TypeScript
  await new Promise((resolve, reject) => {
    const tsc = spawn("npx", ["tsc"], {
      cwd: electronDir,
      stdio: "inherit",
      shell: true,
    });

    tsc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`TypeScript compilation failed with code ${code}`));
      }
    });
  });

  log("Electron", "Starting Electron...");

  electronProcess = spawn("npx", ["electron", "."], {
    cwd: electronDir,
    stdio: "inherit",
    shell: true,
  });

  electronProcess.on("close", () => {
    log("Electron", "Electron closed");
    cleanup();
  });
}

function cleanup() {
  log("Cleanup", "Stopping all processes...");

  if (frontendProcess) {
    frontendProcess.kill();
  }
  if (backendProcess) {
    backendProcess.kill();
  }
  if (electronProcess) {
    electronProcess.kill();
  }

  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

async function main() {
  try {
    log("Dev", "Starting development environment...");

    // 并行启动前端和后端
    await Promise.all([startFrontend(), startBackend()]);

    // 启动 Electron
    await startElectron();
  } catch (error) {
    log("Error", error.message);
    cleanup();
  }
}

main();
