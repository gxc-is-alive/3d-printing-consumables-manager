# Docker 一键部署指南

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+

## 快速部署

### 1. 构建后端代码

```bash
cd backend
npm install
npm run build
cd ..
```

### 2. 创建数据目录

```bash
mkdir -p data
```

> ⚠️ **重要**: `data` 目录用于存储 SQLite 数据库文件，确保数据在容器重启后不会丢失。

### 3. 配置环境变量（可选）

创建 `.env` 文件设置 JWT 密钥：

```bash
echo "JWT_SECRET=your-super-secret-jwt-key-change-in-production" > .env
```

### 4. 一键启动

```bash
docker-compose up -d --build
```

### 5. 访问应用

打开浏览器访问: http://localhost:8080

## 常用命令

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 只看后端日志
docker-compose logs -f backend

# 只看前端日志
docker-compose logs -f frontend
```

### 停止服务

```bash
docker-compose down
```

### 重启服务

```bash
docker-compose restart
```

### 重新构建并启动

```bash
docker-compose up -d --build
```

## 数据持久化

数据库文件存储在 `./data/dev.db`，这个目录通过 Docker volume 挂载到容器内。

### 备份数据

```bash
# 方法1: 直接复制数据库文件
cp ./data/dev.db ./backup/dev.db.backup

# 方法2: 使用应用内的备份功能
# 登录后访问 "数据备份" 页面，导出 JSON 或 Excel
```

### 恢复数据

```bash
# 方法1: 从文件恢复
cp ./backup/dev.db.backup ./data/dev.db
docker-compose restart backend

# 方法2: 使用应用内的恢复功能
# 登录后访问 "数据备份" 页面，导入之前导出的 JSON 文件
```

## 端口配置

默认端口:

- 前端: 8080 (可在 docker-compose.yml 中修改)
- 后端: 3000 (内部端口，不对外暴露)

修改前端端口示例:

```yaml
# docker-compose.yml
frontend:
  ports:
    - "80:80" # 改为 80 端口
```

## 生产环境建议

1. **修改 JWT 密钥**: 在 `.env` 文件中设置强密码
2. **使用 HTTPS**: 在前端 nginx 配置 SSL 证书
3. **定期备份**: 设置 cron 任务定期备份 `./data` 目录
4. **资源限制**: 在 docker-compose.yml 中添加资源限制

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
```

## 故障排除

### 数据库迁移失败

```bash
# 进入后端容器
docker-compose exec backend sh

# 手动运行迁移
npx prisma migrate deploy
```

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs backend

# 检查数据目录权限
ls -la ./data
chmod 755 ./data
```

### 前端无法连接后端

```bash
# 检查后端是否正常运行
docker-compose ps

# 检查网络
docker network ls
docker network inspect consumables-network
```
