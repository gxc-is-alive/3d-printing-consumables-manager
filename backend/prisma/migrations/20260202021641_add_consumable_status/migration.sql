-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Consumable" (
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
    "status" TEXT NOT NULL DEFAULT 'unopened',
    "depletedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Consumable_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Consumable_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Consumable_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ConsumableType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Consumable" ("brandId", "color", "colorHex", "createdAt", "id", "isOpened", "notes", "openedAt", "price", "purchaseDate", "remainingWeight", "typeId", "updatedAt", "userId", "weight") SELECT "brandId", "color", "colorHex", "createdAt", "id", "isOpened", "notes", "openedAt", "price", "purchaseDate", "remainingWeight", "typeId", "updatedAt", "userId", "weight" FROM "Consumable";
DROP TABLE "Consumable";
ALTER TABLE "new_Consumable" RENAME TO "Consumable";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
