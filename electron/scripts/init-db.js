/**
 * 数据库初始化脚本
 * 在首次启动时运行 Prisma 迁移
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function log(message) {
  console.log(`[DB Init] ${message}`);
}

function initDatabase(dbPath, backendPath) {
  log(`Initializing database at: ${dbPath}`);

  // 确保数据库目录存在
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    log(`Created directory: ${dbDir}`);
  }

  // 设置环境变量
  const env = {
    ...process.env,
    DATABASE_URL: `file:${dbPath}`,
  };

  try {
    // 运行 Prisma 迁移
    log("Running Prisma migrations...");
    execSync("npx prisma migrate deploy", {
      cwd: backendPath,
      env,
      stdio: "inherit",
      shell: true,
    });
    log("Database initialized successfully");
    return true;
  } catch (error) {
    log(`Migration failed: ${error.message}`);

    // 如果迁移失败，尝试使用 db push
    try {
      log("Trying db push as fallback...");
      execSync("npx prisma db push", {
        cwd: backendPath,
        env,
        stdio: "inherit",
        shell: true,
      });
      log("Database initialized with db push");
      return true;
    } catch (pushError) {
      log(`DB push also failed: ${pushError.message}`);
      return false;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);
  const dbPath = args[0] || "./data.db";
  const backendPath = args[1] || path.join(__dirname, "..", "..", "backend");

  const success = initDatabase(dbPath, backendPath);
  process.exit(success ? 0 : 1);
}

module.exports = { initDatabase };
