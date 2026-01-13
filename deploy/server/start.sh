#!/bin/bash
# 3D打印耗材管理系统 - 云服务器一键启动脚本
# 用法: chmod +x start.sh && ./start.sh

set -e

# 配置
IMAGE_NAME="crpi-1jw9hqpudq1gxjjv.cn-shanghai.personal.cr.aliyuncs.com/family-accounting/3dprint"
CONTAINER_NAME="3dprint-manager"
DATA_DIR="./3dprint-data"
PORT=8080

echo "=========================================="
echo "3D打印耗材管理系统 - 一键启动"
echo "=========================================="

# 创建数据目录
mkdir -p "$DATA_DIR"

# 停止并删除已存在的容器
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# 拉取最新镜像
echo "拉取最新镜像..."
docker pull "$IMAGE_NAME:latest"

# 启动容器
echo "启动容器..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "$PORT:80" \
    -v "$(pwd)/$DATA_DIR:/data" \
    -e JWT_SECRET="${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}" \
    "$IMAGE_NAME:latest"

# 等待启动
sleep 5

echo ""
echo "=========================================="
echo "启动成功！"
echo "访问地址: http://$(hostname -I | awk '{print $1}'):$PORT"
echo "数据目录: $DATA_DIR"
echo "=========================================="
