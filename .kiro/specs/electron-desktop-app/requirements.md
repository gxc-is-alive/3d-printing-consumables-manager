# 需求文档

## 简介

为现有的 3D 打印耗材管理系统添加 Electron 桌面应用支持。保留原有的 Web 架构（前后端分离），同时提供一个可以打包成 exe 的桌面应用版本。桌面应用将嵌入后端服务和前端界面，实现双击即可运行的用户体验。

## 术语表

- **Electron_App**: 基于 Electron 框架的桌面应用程序，包含主进程和渲染进程
- **Main_Process**: Electron 主进程，负责创建窗口、管理后端服务生命周期
- **Backend_Service**: 现有的 Express + Prisma 后端 API 服务
- **Frontend_App**: 现有的 Vue 3 前端应用
- **SQLite_Database**: 使用 SQLite 作为数据存储的本地数据库

## 需求

### 需求 1：Electron 项目结构

**用户故事：** 作为开发者，我希望有一个独立的 Electron 项目目录，以便在不影响现有 Web 架构的情况下开发桌面应用。

#### 验收标准

1. THE Electron_App SHALL 位于项目根目录下的 `electron` 文件夹中
2. THE Electron_App SHALL 拥有独立的 package.json 配置文件
3. THE Electron_App SHALL 不修改现有的 frontend 和 backend 目录结构
4. THE Electron_App SHALL 使用 TypeScript 进行开发

### 需求 2：后端服务集成

**用户故事：** 作为用户，我希望桌面应用启动时自动运行后端服务，以便无需手动启动服务器。

#### 验收标准

1. WHEN Electron_App 启动时，THE Main_Process SHALL 自动启动 Backend_Service
2. WHEN Electron_App 关闭时，THE Main_Process SHALL 优雅地关闭 Backend_Service
3. THE Backend_Service SHALL 使用动态端口或固定端口（如 3000）运行
4. IF Backend_Service 启动失败，THEN THE Electron_App SHALL 显示错误提示并提供重试选项

### 需求 3：前端界面集成

**用户故事：** 作为用户，我希望在桌面应用窗口中看到完整的前端界面，以便像使用网站一样操作。

#### 验收标准

1. THE Electron_App SHALL 在主窗口中加载 Frontend_App
2. THE Electron_App SHALL 等待 Backend_Service 就绪后再加载前端界面
3. WHILE Backend_Service 正在启动，THE Electron_App SHALL 显示加载界面
4. THE Electron_App SHALL 支持窗口最大化、最小化和关闭操作

### 需求 4：数据库支持

**用户故事：** 作为用户，我希望桌面应用使用本地数据库存储数据，以便数据持久化保存。

#### 验收标准

1. THE Electron_App SHALL 使用 SQLite_Database 存储数据
2. THE SQLite_Database SHALL 存储在用户数据目录中（如 AppData）
3. WHEN 首次启动时，THE Electron_App SHALL 自动初始化数据库结构
4. THE Electron_App SHALL 复用现有的 Prisma schema 定义

### 需求 5：打包和分发

**用户故事：** 作为开发者，我希望能够将应用打包成 Windows exe 文件，以便分发给用户。

#### 验收标准

1. THE Electron_App SHALL 支持使用 electron-builder 打包
2. THE Electron_App SHALL 生成单个可执行的 exe 安装包
3. THE 打包产物 SHALL 包含所有必要的依赖（Node.js 运行时、前端资源、后端代码）
4. THE 打包配置 SHALL 支持自定义应用名称和图标

### 需求 6：开发体验

**用户故事：** 作为开发者，我希望有便捷的开发和调试方式，以便快速迭代。

#### 验收标准

1. THE Electron_App SHALL 提供开发模式脚本
2. WHEN 在开发模式下，THE Electron_App SHALL 支持热重载前端代码
3. THE Electron_App SHALL 提供打开开发者工具的快捷方式
4. THE Electron_App SHALL 在开发模式下连接到本地开发服务器
