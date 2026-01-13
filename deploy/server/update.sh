#!/bin/bash
# 3D打印耗材管理系统 - 云服务器一键更新脚本
# 用法: chmod +x update.sh && ./update.sh
#
# 功能：
# 1. 备份数据库
# 2. 拉取最新镜像
# 3. 重启容器（数据库数据保留）
# 4. 自动执行数据库迁移（在容器启动时）

set -e

# 配置
IMAGE_NAME="crpi-1jw9hqpudq1gxjjv.cn-shanghai.personal.cr.aliyuncs.com/family-accounting/3dprint"
CONTAINER_NAME="3dprint-manager"
DATA_DIR="./3dprint-data"
PORT=8080

echo "=========================================="
echo "3D打印耗材管理系统 - 一键更新"
echo "=========================================="

# 检查数据目录
if [ ! -d "$DATA_DIR" ]; then
    echo "警告: 数据目录不存在，将创建: $DATA_DIR"
    mkdir -p "$DATA_DIR"
fi

# 备份数据库
if [ -f "$DATA_DIR/app.db" ]; then
    BACKUP_FILE="$DATA_DIR/app.db.backup.$(date +%Y%m%d_%H%M%S)"
    echo "备份数据库到: $BACKUP_FILE"
    cp "$DATA_DIR/app.db" "$BACKUP_FILE"
    
    # 只保留最近5个备份
    ls -t "$DATA_DIR"/app.db.backup.* 2>/dev/null | tail -n +6 | xargs -r rm -f
    echo "已清理旧备份，保留最近5个"
fi

# 拉取最新镜像
echo "拉取最新镜像..."
docker pull "$IMAGE_NAME:latest"

# 停止并删除旧容器
echo "停止旧容器..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# 启动新容器
echo "启动新容器..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "$PORT:80" \
    -v "$(pwd)/$DATA_DIR:/data" \
    -e JWT_SECRET="${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}" \
    "$IMAGE_NAME:latest"

# 等待启动并检查状态
echo "等待服务启动..."
sleep 8

if docker ps | grep -q "$CONTAINER_NAME"; then
    echo ""
    echo "=========================================="
    echo "更新成功！"
    echo "访问地址: http://$(hostname -I | awk '{print $1}'):$PORT"
    echo "数据目录: $DATA_DIR (数据已保留)"
    echo "=========================================="
    echo ""
    echo "查看日志: docker logs -f $CONTAINER_NAME"
else
    echo ""
    echo "=========================================="
    echo "错误: 容器启动失败！"
    echo "查看日志: docker logs $CONTAINER_NAME"
    echo "=========================================="
    exit 1
fi
