# 3D 打印耗材管理 - 桌面版

基于 Electron 的桌面应用，将 Web 版本打包成可执行文件。

## 开发

### 前置条件

确保已安装依赖：

```bash
# 安装 Electron 依赖
cd electron
npm install

# 安装前端依赖
cd ../frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 开发模式

```bash
cd electron
npm run dev
```

这将同时启动：

- 前端 Vite 开发服务器 (http://localhost:5173)
- 后端 Express 服务器 (http://localhost:3000)
- Electron 应用

### 运行测试

```bash
cd electron
npm test
```

## 构建和打包

### 构建所有组件

```bash
cd electron
npm run build:all
```

### 打包 Windows 安装程序

```bash
cd electron
npm run dist:win
```

打包完成后，安装程序将位于 `electron/release/` 目录。

## 项目结构

```
electron/
├── src/
│   ├── main.ts           # Electron 主进程
│   ├── preload.ts        # 预加载脚本
│   ├── backend-manager.ts # 后端进程管理
│   ├── utils.ts          # 工具函数
│   └── utils.test.ts     # 测试文件
├── scripts/
│   ├── dev.js            # 开发启动脚本
│   ├── build-all.js      # 构建脚本
│   └── init-db.js        # 数据库初始化
├── resources/            # 应用资源（图标等）
├── electron-builder.yml  # 打包配置
├── package.json
└── tsconfig.json
```

## 注意事项

1. **图标文件**：打包前请在 `resources/` 目录添加应用图标：

   - `icon.ico` - Windows 图标
   - `icon.icns` - macOS 图标
   - `icon.png` - Linux 图标

2. **数据存储**：

   - 开发模式：数据存储在 `backend/prisma/dev.db`
   - 生产模式：数据存储在用户数据目录 (`%APPDATA%/3d-printing-consumables/data/data.db`)

3. **Web 版本**：此 Electron 应用不影响原有的 Web 架构，你仍然可以：
   - 使用 Docker 部署 Web 版本
   - 单独运行前端和后端进行开发
