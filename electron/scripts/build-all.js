/**
 * 生产构建脚本
 * 构建前端、后端和 Electron 应用
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const rootDir = path.join(__dirname, "..", "..");
const frontendDir = path.join(rootDir, "frontend");
const backendDir = path.join(rootDir, "backend");
const electronDir = path.join(rootDir, "electron");

function log(message) {
  console.log(`\n[Build] ${message}`);
}

function exec(command, cwd) {
  console.log(`> ${command}`);
  execSync(command, { cwd, stdio: "inherit", shell: true });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function buildFrontend() {
  log("Building frontend...");
  exec("npm run build", frontendDir);
  log("Frontend build complete");
}

async function buildBackend() {
  log("Building backend...");
  // 只运行 tsc，跳过 prisma generate（避免文件锁定问题）
  exec("npx tsc", backendDir);
  log("Backend build complete");
}

async function buildElectron() {
  log("Building Electron...");
  exec("npm run build", electronDir);
  log("Electron build complete");
}

async function copyPrismaFiles() {
  log("Copying Prisma files...");

  const prismaDir = path.join(backendDir, "prisma");
  const targetPrismaDir = path.join(backendDir, "dist", "prisma");

  ensureDir(targetPrismaDir);

  // 复制 schema.prisma
  const schemaSource = path.join(prismaDir, "schema.prisma");
  const schemaTarget = path.join(targetPrismaDir, "schema.prisma");
  if (fs.existsSync(schemaSource)) {
    fs.copyFileSync(schemaSource, schemaTarget);
    log("Copied schema.prisma");
  }

  // 复制 migrations 目录
  const migrationsSource = path.join(prismaDir, "migrations");
  const migrationsTarget = path.join(targetPrismaDir, "migrations");
  if (fs.existsSync(migrationsSource)) {
    copyDirRecursive(migrationsSource, migrationsTarget);
    log("Copied migrations");
  }
}

function copyDirRecursive(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function createEnvFile() {
  log("Creating production .env file...");

  const envContent = `NODE_ENV=production
PORT=3000
JWT_SECRET=your-production-secret-key-change-this
`;

  const envPath = path.join(backendDir, "dist", ".env");
  fs.writeFileSync(envPath, envContent);
  log("Created .env file");
}

async function main() {
  try {
    log("Starting production build...");

    // 构建前端
    await buildFrontend();

    // 构建后端
    await buildBackend();

    // 复制 Prisma 文件
    await copyPrismaFiles();

    // 创建生产环境配置
    await createEnvFile();

    // 构建 Electron
    await buildElectron();

    log("All builds complete!");
    log('Run "npm run dist:win" to create Windows installer');
  } catch (error) {
    console.error("\n[Build Error]", error.message);
    process.exit(1);
  }
}

main();
