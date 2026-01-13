# 3D 打印耗材管理系统 - Docker 部署指南

## 镜像信息

- 镜像地址: `crpi-1jw9hqpudq1gxjjv.cn-shanghai.personal.cr.aliyuncs.com/family-accounting/3dprint`
- 架构: All-in-One (前端 + 后端 + Nginx)
- 端口: 80 (容器内)

## 快速开始

### 1. 一键启动（首次部署）

**Linux/Mac:**

```bash
chmod +x start-docker.sh
./start-docker.sh
```

**Windows:**

```cmd
双击运行 start-docker.bat
```

### 2. 一键更新

**Linux/Mac:**

```bash
chmod +x update-docker.sh
./update-docker.sh
```

**Windows:**

```cmd
双击运行 update-docker.bat
```

## 数据持久化

- 数据库文件存储在 `./3dprint-data/app.db`
- 更新时会自动备份数据库
- 数据库迁移在容器启动时自动执行

## 自定义配置

### 修改端口

编辑脚本中的 `PORT` 变量：

```bash
PORT=8080  # 改为你想要的端口
```

### 修改 JWT 密钥

设置环境变量或修改脚本：

```bash
export JWT_SECRET="your-secure-secret-key"
./start-docker.sh
```

## 手动操作

### 拉取镜像

```bash
docker pull crpi-1jw9hqpudq1gxjjv.cn-shanghai.personal.cr.aliyuncs.com/family-accounting/3dprint:latest
```

### 启动容器

```bash
docker run -d \
    --name 3dprint-manager \
    --restart unless-stopped \
    -p 8080:80 \
    -v $(pwd)/3dprint-data:/data \
    -e JWT_SECRET="your-secret-key" \
    crpi-1jw9hqpudq1gxjjv.cn-shanghai.personal.cr.aliyuncs.com/family-accounting/3dprint:latest
```

### 查看日志

```bash
docker logs -f 3dprint-manager
```

### 进入容器

```bash
docker exec -it 3dprint-manager sh
```

## 构建镜像（开发者）

### 构建并推送

```bash
# 需要先登录阿里云镜像仓库
docker login crpi-1jw9hqpudq1gxjjv.cn-shanghai.personal.cr.aliyuncs.com

# 构建并推送
./build-and-push.sh v1.0.0
```

## 云服务器部署

1. 在云服务器上安装 Docker
2. 登录阿里云镜像仓库（如果是私有仓库）
3. 下载启动脚本到服务器
4. 运行 `./start-docker.sh`
5. 配置防火墙开放 8080 端口
6. （可选）配置 Nginx 反向代理和 HTTPS

### 示例：使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 故障排除

### 容器启动失败

```bash
docker logs 3dprint-manager
```

### 数据库迁移失败

```bash
# 进入容器手动执行迁移
docker exec -it 3dprint-manager sh
cd /app/backend
npx prisma migrate deploy
```

### 恢复数据库备份

```bash
# 备份文件在 3dprint-data 目录下
cp 3dprint-data/app.db.backup.YYYYMMDD_HHMMSS 3dprint-data/app.db
docker restart 3dprint-manager
```
