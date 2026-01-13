# 3D 打印耗材管理系统 - 云服务器部署

## 快速部署

### 1. 上传脚本到服务器

```bash
# 在本地执行，将脚本上传到服务器
scp start.sh update.sh root@your-server:/opt/3dprint/
```

### 2. 首次启动

```bash
ssh root@your-server
cd /opt/3dprint
chmod +x start.sh update.sh
./start.sh
```

### 3. 后续更新

```bash
cd /opt/3dprint
./update.sh
```

## 配置说明

| 配置项     | 默认值         | 说明                 |
| ---------- | -------------- | -------------------- |
| PORT       | 8080           | 服务端口             |
| DATA_DIR   | ./3dprint-data | 数据目录             |
| JWT_SECRET | 默认值         | JWT 密钥（建议修改） |

### 修改端口

编辑脚本中的 `PORT=8080` 改为你想要的端口。

### 设置 JWT 密钥

```bash
export JWT_SECRET="your-secure-secret-key"
./start.sh
```

## 数据持久化

- 数据库文件: `./3dprint-data/app.db`
- 更新时自动备份数据库
- 保留最近 5 个备份文件

## 常用命令

```bash
# 查看日志
docker logs -f 3dprint-manager

# 停止服务
docker stop 3dprint-manager

# 启动服务
docker start 3dprint-manager

# 重启服务
docker restart 3dprint-manager

# 进入容器
docker exec -it 3dprint-manager sh
```

## 配置 HTTPS（可选）

建议使用 Nginx 反向代理 + Let's Encrypt 证书：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 故障排除

### 容器启动失败

```bash
docker logs 3dprint-manager
```

### 恢复数据库备份

```bash
# 查看备份文件
ls -la 3dprint-data/app.db.backup.*

# 恢复指定备份
cp 3dprint-data/app.db.backup.YYYYMMDD_HHMMSS 3dprint-data/app.db
docker restart 3dprint-manager
```
