/*
  Warnings:

  - You are about to drop the column `bedTempMax` on the `ConsumableType` table. All the data in the column will be lost.
  - You are about to drop the column `bedTempMin` on the `ConsumableType` table. All the data in the column will be lost.
  - You are about to drop the column `printTempMax` on the `ConsumableType` table. All the data in the column will be lost.
  - You are about to drop the column `printTempMin` on the `ConsumableType` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "BrandType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "printTempMin" INTEGER,
    "printTempMax" INTEGER,
    "bedTempMin" INTEGER,
    "bedTempMax" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrandType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BrandType_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BrandType_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ConsumableType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConsumableType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConsumableType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ConsumableType" ("createdAt", "description", "id", "name", "updatedAt", "userId") SELECT "createdAt", "description", "id", "name", "updatedAt", "userId" FROM "ConsumableType";
DROP TABLE "ConsumableType";
ALTER TABLE "new_ConsumableType" RENAME TO "ConsumableType";
CREATE UNIQUE INDEX "ConsumableType_userId_name_key" ON "ConsumableType"("userId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BrandType_brandId_typeId_key" ON "BrandType"("brandId", "typeId");
