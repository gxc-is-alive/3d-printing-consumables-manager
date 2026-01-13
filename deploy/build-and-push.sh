#!/bin/bash
# 3D打印耗材管理系统 - 构建并推送镜像
# 用法: ./build-and-push.sh [tag]
# 示例: ./build-and-push.sh v1.0.0

set -e

# 配置
IMAGE_NAME="crpi-1jw9hqpudq1gxjjv.cn-shanghai.personal.cr.aliyuncs.com/family-accounting/3dprint"
TAG="${1:-latest}"

echo "=========================================="
echo "3D打印耗材管理系统 - 构建并推送镜像"
echo "镜像: $IMAGE_NAME:$TAG"
echo "=========================================="

# 进入项目根目录
cd "$(dirname "$0")/.."

# 构建镜像
echo "构建镜像..."
docker build -t "$IMAGE_NAME:$TAG" -f Dockerfile .

# 同时打上 latest 标签
if [ "$TAG" != "latest" ]; then
    docker tag "$IMAGE_NAME:$TAG" "$IMAGE_NAME:latest"
fi

# 推送镜像
echo "推送镜像..."
docker push "$IMAGE_NAME:$TAG"

if [ "$TAG" != "latest" ]; then
    docker push "$IMAGE_NAME:latest"
fi

echo ""
echo "=========================================="
echo "构建并推送完成！"
echo "镜像: $IMAGE_NAME:$TAG"
echo "=========================================="
