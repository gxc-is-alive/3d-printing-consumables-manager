-- AlterTable
ALTER TABLE "AccessoryUsage" ADD COLUMN "duration" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Accessory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "price" REAL,
    "purchaseDate" DATETIME,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "remainingQty" INTEGER NOT NULL DEFAULT 1,
    "replacementCycle" INTEGER,
    "lastReplacedAt" DATETIME,
    "lowStockThreshold" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'available',
    "usageType" TEXT NOT NULL DEFAULT 'consumable',
    "inUseStartedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Accessory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Accessory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AccessoryCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Accessory" ("brand", "categoryId", "createdAt", "id", "lastReplacedAt", "lowStockThreshold", "model", "name", "notes", "price", "purchaseDate", "quantity", "remainingQty", "replacementCycle", "status", "updatedAt", "userId") SELECT "brand", "categoryId", "createdAt", "id", "lastReplacedAt", "lowStockThreshold", "model", "name", "notes", "price", "purchaseDate", "quantity", "remainingQty", "replacementCycle", "status", "updatedAt", "userId" FROM "Accessory";
DROP TABLE "Accessory";
ALTER TABLE "new_Accessory" RENAME TO "Accessory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
