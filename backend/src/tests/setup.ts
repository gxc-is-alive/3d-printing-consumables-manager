import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables (use test.db instead of dev.db)
config({ path: resolve(__dirname, '../../.env.test') });

import { prisma } from '../db';

// Connect to database before all tests
beforeAll(async () => {
  await prisma.$connect();

  // Ensure tables exist in test database
  try {
    await prisma.$queryRaw`SELECT 1 FROM User LIMIT 1`;
  } catch {
    // Tables don't exist, create them
    await createTestTables();
  }
});

async function createTestTables() {
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

  // 创建 BrandConfigFile 表
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "BrandConfigFile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "brandId" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "fileSize" INTEGER NOT NULL,
      "storagePath" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BrandConfigFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "BrandConfigFile_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `;

  // 创建 MaintenanceRecord 表
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "MaintenanceRecord" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "date" DATETIME NOT NULL,
      "type" TEXT NOT NULL,
      "description" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "MaintenanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `;
}

// Clean up database before each test
beforeEach(async () => {
  // Delete in order respecting foreign key constraints
  await prisma.accessoryUsage.deleteMany();
  await prisma.accessory.deleteMany();
  // 不删除预设分类，只删除用户自定义分类
  await prisma.accessoryCategory.deleteMany({ where: { isPreset: false } });
  await prisma.usageRecord.deleteMany();
  await prisma.consumable.deleteMany();
  await prisma.brandConfigFile.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.consumableType.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.user.deleteMany();
});

// Disconnect from database after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
