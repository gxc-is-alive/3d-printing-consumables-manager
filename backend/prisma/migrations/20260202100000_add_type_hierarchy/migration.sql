-- 为 ConsumableType 添加 parentId 字段实现层级分类
-- parentId 为 null 表示大类，有值表示小类

-- SQLite 需要重建表来修改约束，步骤如下：

-- 1. 创建新表（带 parentId 字段和新的唯一约束）
CREATE TABLE "ConsumableType_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConsumableType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsumableType_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ConsumableType_new" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 2. 复制数据到新表
INSERT INTO "ConsumableType_new" ("id", "userId", "name", "description", "parentId", "createdAt", "updatedAt")
SELECT "id", "userId", "name", "description", NULL, "createdAt", "updatedAt"
FROM "ConsumableType";

-- 3. 删除旧表
DROP TABLE "ConsumableType";

-- 4. 重命名新表
ALTER TABLE "ConsumableType_new" RENAME TO "ConsumableType";

-- 5. 重建索引
CREATE INDEX "ConsumableType_parentId_idx" ON "ConsumableType"("parentId");

-- 6. 创建新的唯一约束（同一父类下名称唯一）
CREATE UNIQUE INDEX "ConsumableType_userId_name_parentId_key" ON "ConsumableType"("userId", "name", "parentId");

-- 注意：数据迁移需要在应用层执行，因为需要：
-- 1. 解析现有类型名称（如 "PETG Matte" -> 大类: PETG, 小类: Matte）
-- 2. 创建大类记录
-- 3. 更新小类的 parentId
-- 请运行 npm run migrate:types 执行数据迁移
