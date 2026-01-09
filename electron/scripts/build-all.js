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

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
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

async function installProductionDeps() {
  log("Installing production dependencies for backend...");

  const prodNodeModules = path.join(backendDir, "dist", "node_modules");

  // 删除旧的 node_modules
  removeDir(prodNodeModules);

  // 创建临时 package.json 只包含生产依赖
  const packageJson = require(path.join(backendDir, "package.json"));
  const prodPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    dependencies: packageJson.dependencies,
  };

  const prodPackageJsonPath = path.join(backendDir, "dist", "package.json");
  fs.writeFileSync(
    prodPackageJsonPath,
    JSON.stringify(prodPackageJson, null, 2)
  );

  // 在 dist 目录安装生产依赖
  exec("npm install --production --omit=dev", path.join(backendDir, "dist"));

  log("Production dependencies installed");

  // 生成 Prisma Client
  log("Generating Prisma Client...");
  // 使用 backend 目录的 prisma CLI 生成 client 到 dist 目录
  const distDir = path.join(backendDir, "dist");
  const schemaPath = path.join(distDir, "prisma", "schema.prisma");

  // 修改 schema.prisma 的 output 路径指向 dist/node_modules/.prisma/client
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  const modifiedSchema = schemaContent.replace(
    'provider = "prisma-client-js"',
    `provider = "prisma-client-js"\n  output   = "../node_modules/.prisma/client"`
  );
  fs.writeFileSync(schemaPath, modifiedSchema);

  // 使用 backend 目录的 prisma 生成 client
  exec(`npx prisma generate --schema="${schemaPath}"`, backendDir);
  log("Prisma Client generated");
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

    // 安装生产依赖到 dist 目录
    await installProductionDeps();

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
