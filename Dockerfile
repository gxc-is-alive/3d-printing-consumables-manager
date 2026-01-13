# All-in-One Dockerfile: 前端 + 后端 + Nginx
# 阶段1: 构建前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
RUN npm config set registry https://registry.npmmirror.com

COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 阶段2: 构建后端
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend
RUN npm config set registry https://registry.npmmirror.com

COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build
# 删除 dist 中的 node_modules（如果存在），避免复制 Windows 版本的 Prisma
RUN rm -rf dist/node_modules

# 阶段3: 生产镜像
FROM node:20-alpine

RUN apk add --no-cache nginx supervisor

WORKDIR /app/backend

# 复制 package.json 和 prisma schema
COPY --from=backend-builder /app/backend/package*.json ./
COPY --from=backend-builder /app/backend/prisma ./prisma/

# 安装生产依赖并在 Linux 环境下生成 Prisma Client
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci --only=production && \
    npx prisma generate

# 复制构建后的代码（不含 node_modules）
COPY --from=backend-builder /app/backend/dist ./dist/

# 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# nginx 配置
RUN mkdir -p /etc/nginx/http.d
COPY deploy/nginx.conf /etc/nginx/http.d/default.conf

# supervisor 配置
COPY deploy/supervisord.conf /etc/supervisord.conf

# 创建数据和上传目录
RUN mkdir -p /data /app/backend/uploads

# 环境变量
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/app.db"
ENV PORT=3000
ENV JWT_SECRET="change-this-in-production"

EXPOSE 80

WORKDIR /app

COPY deploy/start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
