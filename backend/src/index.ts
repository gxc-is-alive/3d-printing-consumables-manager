import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './db';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res
      .status(500)
      .json({ status: 'error', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 初始化数据库表
async function initDatabase() {
  console.log('Checking database...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);

  try {
    // 尝试连接数据库
    await prisma.$connect();
    console.log('Database connected');

    // 检查 User 表是否存在
    try {
      await prisma.$queryRaw`SELECT 1 FROM User LIMIT 1`;
      console.log('Database tables exist');
    } catch (error: any) {
      console.log('Tables may not exist, creating...');
      // 使用原始 SQL 创建表（SQLite）
      await createTables();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

async function createTables() {
  console.log('Creating database tables...');

  // 创建 User 表
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )
  `;
  await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`;

  // 创建 Brand 表
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Brand" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "website" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Brand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `;
  await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Brand_userId_name_key" ON "Brand"("userId", "name")`;

  // 创建 ConsumableType 表
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "ConsumableType" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "printTempMin" INTEGER,
      "printTempMax" INTEGER,
      "bedTempMin" INTEGER,
      "bedTempMax" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "ConsumableType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `;
  await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "ConsumableType_userId_name_key" ON "ConsumableType"("userId", "name")`;

  // 创建 Consumable 表
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Consumable" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "brandId" TEXT NOT NULL,
      "typeId" TEXT NOT NULL,
      "color" TEXT NOT NULL,
      "colorHex" TEXT,
      "weight" REAL NOT NULL,
      "remainingWeight" REAL NOT NULL,
      "price" REAL NOT NULL,
      "purchaseDate" DATETIME NOT NULL,
      "openedAt" DATETIME,
      "isOpened" BOOLEAN NOT NULL DEFAULT false,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Consumable_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Consumable_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Consumable_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ConsumableType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `;

  // 创建 UsageRecord 表
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "UsageRecord" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "consumableId" TEXT NOT NULL,
      "amountUsed" REAL NOT NULL,
      "usageDate" DATETIME NOT NULL,
      "projectName" TEXT,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "UsageRecord_consumableId_fkey" FOREIGN KEY ("consumableId") REFERENCES "Consumable" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `;

  console.log('Database tables created successfully');
}

// Start server
async function startServer() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();

export default app;
