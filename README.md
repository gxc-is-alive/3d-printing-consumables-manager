# 3D 打印耗材管理系统

一个用于管理 3D 打印耗材库存的全栈应用，支持 Web 端和桌面端（Electron）。

## 功能特性

- 📊 **库存仪表盘** - 查看库存概览和统计数据
- 🏷️ **品牌管理** - 管理耗材品牌信息
- 📦 **类型管理** - 管理耗材类型（PLA、ABS、PETG 等）
- 🎨 **耗材管理** - 管理耗材库存，支持颜色搜索
- 📝 **使用记录** - 记录耗材使用情况
- 💾 **数据备份** - 备份数据、导出 Excel 报表
- ❤️ **捐赠支持** - 支持开发者

## 技术栈

### 前端

- Vue 3 + TypeScript
- Pinia 状态管理
- Vue Router
- Axios

### 后端

- Node.js + Express
- Prisma ORM
- SQLite 数据库
- JWT 认证

### 桌面端

- Electron
- electron-builder 打包

## 项目结构

```
├── frontend/          # Vue 前端项目
├── backend/           # Express 后端项目
├── electron/          # Electron 桌面应用
└── docker-compose.yml # Docker 部署配置
```

## 开发环境

### 前置要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
# 前端
cd frontend && npm install

# 后端
cd backend && npm install

# Electron
cd electron && npm install
```

### 启动开发服务器

```bash
# 启动后端 (端口 3000)
cd backend && npm run dev

# 启动前端 (端口 5173)
cd frontend && npm run dev

# 启动 Electron 开发模式
cd electron && npm run dev
```

## 构建

### Web 版本

```bash
# 构建前端
cd frontend && npm run build

# 构建后端
cd backend && npm run build
```

### 桌面版本 (Windows)

```bash
cd electron && npm run dist:win
```

打包后的安装程序在 `electron/release/` 目录下。

## Docker 部署

```bash
docker-compose up -d
```

详细部署说明请参考 [DOCKER-DEPLOY.md](./DOCKER-DEPLOY.md)

## 许可证

MIT
