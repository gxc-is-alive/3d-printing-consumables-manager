#!/bin/sh

echo "=========================================="
echo "3D打印耗材管理系统 - 启动中..."
echo "=========================================="

# 进入后端目录
cd /app/backend

# 执行数据库迁移（这会自动创建数据库并应用所有迁移）
echo "正在执行数据库迁移..."
if npx prisma migrate deploy; then
    echo "数据库迁移完成！"
else
    echo "警告: 数据库迁移失败，尝试继续启动..."
    # 如果迁移失败，尝试直接推送 schema（适用于首次部署）
    npx prisma db push --accept-data-loss 2>/dev/null || echo "db push 也失败了，继续启动..."
fi

# 修复旧数据的 status 字段
echo "正在修复数据..."
npx prisma db execute --stdin --schema prisma/schema.prisma <<EOF
UPDATE Consumable SET status = 'opened' WHERE isOpened = 1 AND status = 'unopened';
EOF
echo "数据修复完成！"

# 执行类型层级迁移（将单级类型转换为两级分类）
echo "正在执行类型层级迁移..."
node dist/scripts/migrateTypeHierarchy.js --execute 2>/dev/null || echo "类型层级迁移跳过（可能已完成或无需迁移）"
echo "类型层级迁移检查完成！"

# 返回应用目录
cd /app

# 启动 supervisor（管理 nginx 和 node 进程）
echo "启动服务..."
exec /usr/bin/supervisord -c /etc/supervisord.conf
