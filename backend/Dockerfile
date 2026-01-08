FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制 Prisma schema
COPY prisma ./prisma/

# 生成 Prisma Client
RUN npx prisma generate

# 复制构建后的代码
COPY dist ./dist/

# 创建数据目录
RUN mkdir -p /data

# 设置环境变量
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/dev.db"
ENV PORT=3000

EXPOSE 3000

# 启动命令：先迁移数据库，再启动服务
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
