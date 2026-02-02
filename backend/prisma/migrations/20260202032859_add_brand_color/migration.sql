-- CreateTable
CREATE TABLE "BrandColor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#CCCCCC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrandColor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BrandColor_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BrandColor_brandId_idx" ON "BrandColor"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandColor_brandId_colorName_key" ON "BrandColor"("brandId", "colorName");

-- 数据迁移：从现有耗材中提取颜色并添加到品牌颜色库
-- 使用 SQLite 的 lower(hex(randomblob(16))) 生成 UUID
-- 对于多色耗材（colorHex 包含逗号），只取第一个颜色
INSERT OR IGNORE INTO "BrandColor" ("id", "userId", "brandId", "colorName", "colorHex", "createdAt", "updatedAt")
SELECT 
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) as id,
    c."userId",
    c."brandId",
    TRIM(c."color") as colorName,
    COALESCE(
        CASE 
            WHEN c."colorHex" IS NOT NULL AND c."colorHex" != '' 
            THEN TRIM(SUBSTR(c."colorHex", 1, CASE WHEN INSTR(c."colorHex", ',') > 0 THEN INSTR(c."colorHex", ',') - 1 ELSE LENGTH(c."colorHex") END))
            ELSE '#CCCCCC'
        END,
        '#CCCCCC'
    ) as colorHex,
    CURRENT_TIMESTAMP as createdAt,
    CURRENT_TIMESTAMP as updatedAt
FROM "Consumable" c
WHERE c."color" IS NOT NULL AND TRIM(c."color") != ''
GROUP BY c."userId", c."brandId", TRIM(c."color");
